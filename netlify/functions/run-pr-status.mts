import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { runs } from "../../db/schema.ts";
import { eq, and } from "drizzle-orm";
import { requireAuth, handleAuthError } from "./_shared/auth.mts";
import {
  parsePrUrl,
  githubHeaders,
  computeReviewDecision,
  computeOverallCheckStatus,
  fetchAllChecks,
} from "./_shared/github.mts";

export default async (req: Request, context: Context) => {
  if (req.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let auth;
  try {
    auth = await requireAuth(req);
  } catch (err) {
    return handleAuthError(err);
  }

  const { id: runId } = context.params;

  if (!runId) {
    return Response.json({ error: "Run ID required" }, { status: 400 });
  }

  const [run] = await db.select().from(runs).where(and(eq(runs.id, runId), eq(runs.userId, auth.userId)));
  if (!run) {
    return Response.json({ error: "Run not found" }, { status: 404 });
  }

  if (!run.pullRequestUrl) {
    return Response.json({ error: "Run has no pull request" }, { status: 400 });
  }

  const githubPat = Netlify.env.get("GITHUB_PAT");
  if (!githubPat) {
    return Response.json({ error: "GITHUB_PAT not configured" }, { status: 500 });
  }

  const parsed = parsePrUrl(run.pullRequestUrl);
  if (!parsed) {
    return Response.json({ error: "Could not parse PR URL" }, { status: 400 });
  }

  const { owner, repo, number } = parsed;

  // Fetch PR details (need head SHA for checks)
  const prRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
    { headers: githubHeaders(githubPat) }
  );

  if (!prRes.ok) {
    const error = await prRes.text();
    return Response.json({ error: `GitHub API error: ${error}` }, { status: prRes.status });
  }

  const pr = await prRes.json();
  const headSha = pr.head.sha;

  // Fetch reviews and all checks in parallel
  const [reviewsRes, checksResult] = await Promise.all([
    fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/reviews`,
      { headers: githubHeaders(githubPat) }
    ),
    fetchAllChecks(owner, repo, headSha, githubPat),
  ]);

  const reviews = reviewsRes.ok ? await reviewsRes.json() : [];
  const reviewDecision = computeReviewDecision(
    Array.isArray(reviews) ? reviews : []
  );

  const { allChecks, deployPreviewUrl } = checksResult;
  const overallCheckStatus = computeOverallCheckStatus(allChecks);

  // Store overall check status (and deploy preview if found) on the run
  const runUpdates: Record<string, any> = { prCheckStatus: overallCheckStatus };
  if (deployPreviewUrl && deployPreviewUrl !== run.deployPreviewUrl) {
    runUpdates.deployPreviewUrl = deployPreviewUrl;
  }
  await db.update(runs).set(runUpdates).where(eq(runs.id, runId));

  const checksUrl = `https://github.com/${owner}/${repo}/pull/${number}/checks`;

  return Response.json({
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
