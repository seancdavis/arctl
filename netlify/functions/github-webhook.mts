import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { runs } from "../../db/schema.ts";
import { eq } from "drizzle-orm";
import {
  parsePrUrl,
  computeOverallCheckStatus,
  fetchAllChecks,
} from "./_shared/github.mts";

async function verifySignature(
  secret: string,
  body: string,
  signature: string | null
): Promise<boolean> {
  if (!signature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const digest = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expected = `sha256=${digest}`;
  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const webhookSecret = Netlify.env.get("GITHUB_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("[github-webhook] GITHUB_WEBHOOK_SECRET not configured");
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  const valid = await verifySignature(webhookSecret, body, signature);
  if (!valid) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  const payload = JSON.parse(body);

  console.log(`[github-webhook] Received event: ${event}, action: ${payload.action || "n/a"}`);

  if (event === "pull_request") {
    await handlePullRequestEvent(payload);
  } else if (event === "check_run") {
    await handleCheckRunEvent(payload);
  } else if (event === "status") {
    await handleStatusEvent(payload);
  }

  return Response.json({ ok: true });
};

async function handlePullRequestEvent(payload: any) {
  const prUrl = payload.pull_request?.html_url;
  if (!prUrl) return;

  const matchingRuns = await db
    .select()
    .from(runs)
    .where(eq(runs.pullRequestUrl, prUrl));

  if (matchingRuns.length === 0) {
    console.log(`[github-webhook] No runs matched PR URL: ${prUrl}`);
    return;
  }

  const now = new Date();
  const action = payload.action;

  for (const run of matchingRuns) {
    if (action === "closed" && payload.pull_request.merged) {
      await db
        .update(runs)
        .set({
          pullRequestState: "merged",
          mergedAt: now,
          updatedAt: now,
        })
        .where(eq(runs.id, run.id));
      console.log(`[github-webhook] Run ${run.id}: PR merged`);
    } else if (action === "closed") {
      await db
        .update(runs)
        .set({
          pullRequestState: "closed",
          updatedAt: now,
        })
        .where(eq(runs.id, run.id));
      console.log(`[github-webhook] Run ${run.id}: PR closed`);
    } else if (action === "opened" || action === "synchronize" || action === "reopened") {
      await db
        .update(runs)
        .set({
          pullRequestState: "open",
          updatedAt: now,
        })
        .where(eq(runs.id, run.id));
      console.log(`[github-webhook] Run ${run.id}: PR ${action}`);
    }
  }
}

async function handleCheckRunEvent(payload: any) {
  const branch = payload.check_run?.check_suite?.head_branch;
  if (!branch) return;

  await recomputeChecksForBranch(branch, payload.repository);
}

async function handleStatusEvent(payload: any) {
  const branches = payload.branches || [];
  const repo = payload.repository;

  // Update deploy preview URL if this is a Netlify deploy status
  if (payload.context === "deploy/netlify" && payload.state === "success" && payload.target_url) {
    for (const branch of branches) {
      const matchingRuns = await db
        .select()
        .from(runs)
        .where(eq(runs.pullRequestBranch, branch.name));

      for (const run of matchingRuns) {
        if (run.pullRequestState !== "open") continue;
        if (run.deployPreviewUrl !== payload.target_url) {
          await db
            .update(runs)
            .set({ deployPreviewUrl: payload.target_url, updatedAt: new Date() })
            .where(eq(runs.id, run.id));
          console.log(`[github-webhook] Run ${run.id}: deploy preview URL updated`);
        }
      }
    }
  }

  // Recompute check status for each branch
  for (const branch of branches) {
    await recomputeChecksForBranch(branch.name, repo);
  }
}

async function recomputeChecksForBranch(branchName: string, repo: any) {
  const matchingRuns = await db
    .select()
    .from(runs)
    .where(eq(runs.pullRequestBranch, branchName));

  if (matchingRuns.length === 0) return;

  const githubPat = Netlify.env.get("GITHUB_PAT");
  if (!githubPat) {
    console.error("[github-webhook] GITHUB_PAT not configured, cannot recompute checks");
    return;
  }

  for (const run of matchingRuns) {
    if (run.pullRequestState !== "open") continue;
    if (!run.pullRequestUrl) continue;

    const parsed = parsePrUrl(run.pullRequestUrl);
    if (!parsed) continue;

    const { owner, repo: repoName, number } = parsed;

    try {
      // Fetch PR to get head SHA
      const prRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/pulls/${number}`,
        {
          headers: {
            Authorization: `token ${githubPat}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!prRes.ok) continue;

      const pr = await prRes.json();
      const headSha = pr.head.sha;

      const { allChecks, deployPreviewUrl } = await fetchAllChecks(
        owner,
        repoName,
        headSha,
        githubPat
      );

      const overallStatus = computeOverallCheckStatus(allChecks);
      const updates: Record<string, any> = {
        prCheckStatus: overallStatus,
        updatedAt: new Date(),
      };
      if (deployPreviewUrl && deployPreviewUrl !== run.deployPreviewUrl) {
        updates.deployPreviewUrl = deployPreviewUrl;
      }

      await db.update(runs).set(updates).where(eq(runs.id, run.id));
      console.log(`[github-webhook] Run ${run.id}: recomputed checks -> ${overallStatus}`);
    } catch (err) {
      console.error(`[github-webhook] Failed to recompute checks for run ${run.id}:`, err);
    }
  }
}

export const config: Config = {
  path: "/api/webhooks/github",
};
