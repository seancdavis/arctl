import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { runs } from "../../db/schema.ts";
import { eq } from "drizzle-orm";
import { requireAuth, handleAuthError } from "./_shared/auth.mts";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
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

  const [run] = await db.select().from(runs).where(eq(runs.id, runId));
  if (!run) {
    return Response.json({ error: "Run not found" }, { status: 404 });
  }

  // Check if this is an update action
  let body: { action?: string } = {};
  try {
    body = await req.json();
  } catch {
    // No body = create action (default)
  }

  if (body.action === "update") {
    // --- Update PR: commit to existing PR branch ---
    if (!run.pullRequestUrl) {
      return Response.json({ error: "No PR exists to update" }, { status: 400 });
    }
    if (!run.pullRequestBranch) {
      return Response.json(
        { error: "PR branch not known — try syncing the run first" },
        { status: 400 }
      );
    }
    if (run.pullRequestState !== "open" && run.pullRequestState !== "draft") {
      return Response.json({ error: "PR is not open or draft" }, { status: 400 });
    }

    const commitRes = await fetch(
      `https://api.netlify.com/api/v1/agent_runners/${runId}/commit`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target_branch: run.pullRequestBranch }),
      }
    );

    if (!commitRes.ok) {
      const error = await commitRes.text();
      return Response.json(
        { error: `Failed to update PR: ${error}` },
        { status: commitRes.status }
      );
    }

    // Re-sync the run from API to get fresh state
    const syncRes = await fetch(
      `https://api.netlify.com/api/v1/agent_runners/${runId}`,
      { headers: { Authorization: `Bearer ${auth.accessToken}` } }
    );
    if (syncRes.ok) {
      const netlifyRun = await syncRes.json();
      const now = new Date();
      await db
        .update(runs)
        .set({
          state: (netlifyRun.state || run.state).toUpperCase(),
          pullRequestUrl: netlifyRun.pr_url || run.pullRequestUrl,
          pullRequestState: netlifyRun.pr_state || run.pullRequestState,
          pullRequestBranch: netlifyRun.pr_branch || run.pullRequestBranch,
          deployPreviewUrl: netlifyRun.latest_session_deploy_url || run.deployPreviewUrl,
          prCommittedAt: now,
          prNeedsUpdate: false,
          updatedAt: now,
          syncedAt: now,
        })
        .where(eq(runs.id, runId));
    } else {
      const now = new Date();
      await db
        .update(runs)
        .set({ prCommittedAt: now, prNeedsUpdate: false, updatedAt: now })
        .where(eq(runs.id, runId));
    }

    const [updatedRun] = await db.select().from(runs).where(eq(runs.id, runId));
    return Response.json(updatedRun);
  }

  // --- Create PR (default) ---
  if (run.state !== "DONE") {
    return Response.json(
      { error: "Run must be completed before creating PR" },
      { status: 400 }
    );
  }

  if (run.pullRequestUrl) {
    return Response.json(
      { error: "PR already exists", pull_request_url: run.pullRequestUrl },
      { status: 400 }
    );
  }

  const createRes = await fetch(
    `https://api.netlify.com/api/v1/agent_runners/${runId}/pull_request`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!createRes.ok) {
    const error = await createRes.text();
    return Response.json(
      { error: `Failed to create PR: ${error}` },
      { status: createRes.status }
    );
  }

  const result = await createRes.json();
  const now = new Date();

  await db
    .update(runs)
    .set({
      pullRequestUrl: result.pr_url || null,
      pullRequestState: result.pr_state || "open",
      pullRequestBranch: result.pr_branch || null,
      prCommittedAt: now,
      prNeedsUpdate: false,
      updatedAt: now,
    })
    .where(eq(runs.id, runId));

  const [updatedRun] = await db.select().from(runs).where(eq(runs.id, runId));
  return Response.json(updatedRun);
};

export const config: Config = {
  path: "/api/runs/:id/pull-request",
};
