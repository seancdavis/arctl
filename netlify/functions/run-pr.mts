import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { runs } from "../../db/schema.ts";
import { eq } from "drizzle-orm";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  // Path: /api/runs/:id/pull-request
  const pathParts = url.pathname.split("/");
  const runId = pathParts[pathParts.length - 2];

  if (!runId) {
    return new Response(JSON.stringify({ error: "Run ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [run] = await db.select().from(runs).where(eq(runs.id, runId));
  if (!run) {
    return new Response(JSON.stringify({ error: "Run not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const pat = Netlify.env.get("NETLIFY_PAT");
  if (!pat) {
    return new Response(
      JSON.stringify({ error: "NETLIFY_PAT not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
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
      return new Response(
        JSON.stringify({ error: "No PR exists to update" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!run.pullRequestBranch) {
      return new Response(
        JSON.stringify({ error: "PR branch not known — try syncing the run first" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (run.pullRequestState !== "open" && run.pullRequestState !== "draft") {
      return new Response(
        JSON.stringify({ error: "PR is not open or draft" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const commitRes = await fetch(
      `https://api.netlify.com/api/v1/agent_runners/${runId}/commit`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pat}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target_branch: run.pullRequestBranch }),
      }
    );

    if (!commitRes.ok) {
      const error = await commitRes.text();
      return new Response(
        JSON.stringify({ error: `Failed to update PR: ${error}` }),
        { status: commitRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Re-sync the run from API to get fresh state
    const syncRes = await fetch(
      `https://api.netlify.com/api/v1/agent_runners/${runId}`,
      { headers: { Authorization: `Bearer ${pat}` } }
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
      // Even if re-sync fails, mark the commit as done
      const now = new Date();
      await db
        .update(runs)
        .set({ prCommittedAt: now, prNeedsUpdate: false, updatedAt: now })
        .where(eq(runs.id, runId));
    }

    const [updatedRun] = await db.select().from(runs).where(eq(runs.id, runId));
    return new Response(JSON.stringify(updatedRun), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- Create PR (default) ---
  if (run.state !== "DONE") {
    return new Response(
      JSON.stringify({ error: "Run must be completed before creating PR" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (run.pullRequestUrl) {
    return new Response(
      JSON.stringify({
        error: "PR already exists",
        pull_request_url: run.pullRequestUrl,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const createRes = await fetch(
    `https://api.netlify.com/api/v1/agent_runners/${runId}/pull_request`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!createRes.ok) {
    const error = await createRes.text();
    return new Response(
      JSON.stringify({ error: `Failed to create PR: ${error}` }),
      { status: createRes.status, headers: { "Content-Type": "application/json" } }
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

  return new Response(JSON.stringify(updatedRun), {
    headers: { "Content-Type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/runs/:id/pull-request",
};
