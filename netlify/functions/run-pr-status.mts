import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { runs } from "../../db/schema.ts";
import { eq } from "drizzle-orm";
import { requireAuth, handleAuthError } from "./_shared/auth.mts";

function parsePrUrl(
  url: string
): { owner: string; repo: string; number: number } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: parseInt(match[3], 10) };
}

function computeReviewDecision(reviews: any[]): string | null {
  const latestByReviewer = new Map<string, string>();
  for (const review of reviews) {
    if (review.state === "COMMENTED" || review.state === "DISMISSED") continue;
    latestByReviewer.set(review.user.login, review.state);
  }

  const states = [...latestByReviewer.values()];
  if (states.length === 0) return null;
  if (states.includes("CHANGES_REQUESTED")) return "changes_requested";
  if (states.includes("APPROVED")) return "approved";
  return "pending";
}

function computeOverallCheckStatus(checkRuns: any[]): string | null {
  if (checkRuns.length === 0) return null;

  const hasFailure = checkRuns.some(
    (c: any) =>
      c.conclusion === "failure" ||
      c.conclusion === "timed_out" ||
      c.conclusion === "action_required"
  );
  const hasPending = checkRuns.some((c: any) => c.status !== "completed");

  if (hasFailure) return "failure";
  if (hasPending) return "pending";
  return "success";
}

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export default async (req: Request, context: Context) => {
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    await requireAuth(req);
  } catch (err) {
    return handleAuthError(err);
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  // Path: /api/runs/:id/pr-status
  const runId = pathParts[pathParts.length - 2];

  if (!runId) {
    return json({ error: "Run ID required" }, 400);
  }

  const [run] = await db.select().from(runs).where(eq(runs.id, runId));
  if (!run) {
    return json({ error: "Run not found" }, 404);
  }

  if (!run.pullRequestUrl) {
    return json({ error: "Run has no pull request" }, 400);
  }

  const githubPat = Netlify.env.get("GITHUB_PAT");
  if (!githubPat) {
    return json({ error: "GITHUB_PAT not configured" }, 500);
  }

  const parsed = parsePrUrl(run.pullRequestUrl);
  if (!parsed) {
    return json({ error: "Could not parse PR URL" }, 400);
  }

  const { owner, repo, number } = parsed;
  const ghHeaders = {
    Authorization: `token ${githubPat}`,
    Accept: "application/vnd.github.v3+json",
  };

  // Fetch PR details first (need head SHA for checks)
  const prRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
    { headers: ghHeaders }
  );

  if (!prRes.ok) {
    const error = await prRes.text();
    return json({ error: `GitHub API error: ${error}` }, prRes.status);
  }

  const pr = await prRes.json();
  const headSha = pr.head.sha;

  // Fetch reviews, check runs, and commit statuses in parallel
  const [reviewsRes, checksRes, statusesRes] = await Promise.all([
    fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/reviews`,
      { headers: ghHeaders }
    ),
    fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${headSha}/check-runs`,
      { headers: ghHeaders }
    ),
    fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${headSha}/statuses`,
      { headers: ghHeaders }
    ),
  ]);

  const reviews = reviewsRes.ok ? await reviewsRes.json() : [];
  const checksData = checksRes.ok ? await checksRes.json() : { check_runs: [] };
  const statuses = statusesRes.ok ? await statusesRes.json() : [];

  const reviewDecision = computeReviewDecision(
    Array.isArray(reviews) ? reviews : []
  );

  // Normalize check runs
  const checkRuns = (checksData.check_runs || []).map((c: any) => ({
    name: c.name,
    status: c.status,
    conclusion: c.conclusion,
    detailsUrl: c.details_url || c.html_url || null,
  }));

  // Normalize commit statuses (dedupe: take latest per context)
  const latestStatuses = new Map<string, any>();
  for (const s of Array.isArray(statuses) ? statuses : []) {
    if (!latestStatuses.has(s.context)) {
      latestStatuses.set(s.context, s);
    }
    // GitHub returns statuses newest-first, so first seen = latest
  }
  const statusChecks = [...latestStatuses.values()].map((s: any) => ({
    name: s.context,
    status: s.state === "pending" ? "in_progress" : "completed",
    conclusion:
      s.state === "success"
        ? "success"
        : s.state === "pending"
        ? null
        : "failure",
    detailsUrl: s.target_url || null,
  }));

  // Merge both into a single checks list
  const allChecks = [...checkRuns, ...statusChecks];
  const overallCheckStatus = computeOverallCheckStatus(allChecks);

  // Find deploy preview URL from Netlify deploy status
  const deployStatus = latestStatuses.get("deploy/netlify");
  const deployPreviewUrl = deployStatus?.target_url || null;

  // Store overall check status (and deploy preview if found) on the run
  const runUpdates: Record<string, any> = { prCheckStatus: overallCheckStatus };
  if (deployPreviewUrl && deployPreviewUrl !== run.deployPreviewUrl) {
    runUpdates.deployPreviewUrl = deployPreviewUrl;
  }
  await db.update(runs).set(runUpdates).where(eq(runs.id, runId));

  const checksUrl = `https://github.com/${owner}/${repo}/pull/${number}/checks`;

  return json({
    mergeable: pr.mergeable,
    mergeableState: pr.mergeable_state || "unknown",
    reviewDecision,
    overallCheckStatus,
    checks: allChecks,
    checksUrl,
    deployPreviewUrl,
  });
};

export const config: Config = {
  path: "/api/runs/:id/pr-status",
};
