import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { runs, sessions } from "../../db/schema.ts";
import { eq, asc } from "drizzle-orm";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  const runId = pathParts[pathParts.length - 1];

  if (!runId) {
    return new Response(JSON.stringify({ error: "Run ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "GET") {
    const shouldSync = url.searchParams.get("sync") === "true";

    // If sync=true, fetch fresh data from Netlify API and update DB first
    if (shouldSync) {
      const pat = Netlify.env.get("NETLIFY_PAT");
      if (pat) {
        try {
          const apiRes = await fetch(
            `https://api.netlify.com/api/v1/agent_runners/${runId}`,
            { headers: { Authorization: `Bearer ${pat}` } }
          );
          if (apiRes.ok) {
            const netlifyRun = await apiRes.json();
            const now = new Date();

            const [existingRun] = await db.select().from(runs).where(eq(runs.id, runId));
            if (existingRun) {
              await db
                .update(runs)
                .set({
                  state: (netlifyRun.state || existingRun.state).toUpperCase(),
                  title: netlifyRun.title || existingRun.title,
                  branch: netlifyRun.branch || existingRun.branch,
                  pullRequestUrl: netlifyRun.pr_url || existingRun.pullRequestUrl,
                  pullRequestState: netlifyRun.pr_state || existingRun.pullRequestState,
                  pullRequestBranch: netlifyRun.pr_branch || existingRun.pullRequestBranch,
                  deployPreviewUrl: netlifyRun.latest_session_deploy_url || existingRun.deployPreviewUrl,
                  updatedAt: netlifyRun.updated_at ? new Date(netlifyRun.updated_at) : now,
                  syncedAt: now,
                })
                .where(eq(runs.id, runId));
            }

            // Sync sessions too
            const sessionsRes = await fetch(
              `https://api.netlify.com/api/v1/agent_runners/${runId}/sessions`,
              { headers: { Authorization: `Bearer ${pat}` } }
            );
            if (sessionsRes.ok) {
              const netlifySessionList = await sessionsRes.json();
              for (const session of netlifySessionList) {
                const [existing] = await db.select().from(sessions).where(eq(sessions.id, session.id));
                if (!existing) {
                  await db.insert(sessions).values({
                    id: session.id,
                    runId: runId,
                    state: session.state || "NEW",
                    prompt: session.prompt || null,
                    createdAt: session.created_at ? new Date(session.created_at) : now,
                    updatedAt: session.updated_at ? new Date(session.updated_at) : now,
                  });
                  // If run has a PR, mark it as needing update
                  if (netlifyRun.pr_url || existingRun?.pullRequestUrl) {
                    await db.update(runs).set({ prNeedsUpdate: true }).where(eq(runs.id, runId));
                  }
                } else if (existing.state !== session.state) {
                  await db
                    .update(sessions)
                    .set({
                      state: session.state,
                      updatedAt: session.updated_at ? new Date(session.updated_at) : now,
                    })
                    .where(eq(sessions.id, session.id));
                }
              }
            }
          }
        } catch (e) {
          console.error(`[run] Failed to sync run ${runId} from Netlify API:`, e);
        }
      }
    }

    const [run] = await db.select().from(runs).where(eq(runs.id, runId));

    if (!run) {
      return new Response(JSON.stringify({ error: "Run not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const runSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.runId, runId))
      .orderBy(asc(sessions.createdAt));

    return new Response(JSON.stringify({ ...run, sessions: runSessions }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "PATCH") {
    const body = await req.json();
    const { custom_notes, archived } = body;

    const [existingRun] = await db.select().from(runs).where(eq(runs.id, runId));
    if (!existingRun) {
      return new Response(JSON.stringify({ error: "Run not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const updates: Partial<typeof runs.$inferInsert> = { updatedAt: now };

    if (archived === true) {
      updates.archivedAt = now;
    } else if (archived === false) {
      updates.archivedAt = null;
    }

    if (custom_notes !== undefined) {
      updates.customNotes = custom_notes;
    }

    await db.update(runs).set(updates).where(eq(runs.id, runId));

    const [run] = await db.select().from(runs).where(eq(runs.id, runId));
    return new Response(JSON.stringify(run), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/runs/:id",
};
