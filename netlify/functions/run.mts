import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { runs, sessions, notes } from "../../db/schema.ts";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth, handleAuthError } from "./_shared/auth.mts";
import { maybeSync } from "./_shared/maybeSync.mts";

export default async (req: Request, context: Context) => {
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

  if (req.method === "GET") {
    const url = new URL(req.url);
    const shouldSync = url.searchParams.get("sync") === "true";

    // If sync=true, fetch fresh data from Netlify API and update DB first
    if (shouldSync) {
      try {
        const apiRes = await fetch(
          `https://api.netlify.com/api/v1/agent_runners/${runId}`,
          { headers: { Authorization: `Bearer ${auth.accessToken}` } }
        );
        if (apiRes.ok) {
          const netlifyRun = await apiRes.json();
          const now = new Date();

          const [existingRun] = await db.select().from(runs).where(and(eq(runs.id, runId), eq(runs.userId, auth.userId)));
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
            { headers: { Authorization: `Bearer ${auth.accessToken}` } }
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
                  title: session.title || null,
                  result: session.result || null,
                  duration: session.duration ?? null,
                  doneAt: session.done_at ? new Date(session.done_at) : null,
                  mode: session.mode || null,
                  hasResultDiff: session.has_result_diff ?? false,
                });
                if (netlifyRun.pr_url || existingRun?.pullRequestUrl) {
                  await db.update(runs).set({ prNeedsUpdate: true }).where(eq(runs.id, runId));
                }
              } else {
                const sessionUpdates: Record<string, any> = {};
                if (existing.state !== session.state) {
                  sessionUpdates.state = session.state;
                }
                sessionUpdates.updatedAt = session.updated_at ? new Date(session.updated_at) : now;
                if (session.title) sessionUpdates.title = session.title;
                if (session.result) sessionUpdates.result = session.result;
                if (session.duration != null) sessionUpdates.duration = session.duration;
                if (session.done_at) sessionUpdates.doneAt = new Date(session.done_at);
                if (session.mode) sessionUpdates.mode = session.mode;
                if (session.has_result_diff != null) sessionUpdates.hasResultDiff = session.has_result_diff;

                await db
                  .update(sessions)
                  .set(sessionUpdates)
                  .where(eq(sessions.id, session.id));
              }
            }
          }
        }
      } catch (e) {
        console.error(`[run] Failed to sync run ${runId} from Netlify API:`, e);
      }
    }

    // SWR: if not doing a direct sync, trigger background sync if stale
    if (!shouldSync) {
      const origin = new URL(req.url).origin;
      maybeSync({ origin, accessToken: auth.accessToken });
    }

    const [run] = await db.select().from(runs).where(and(eq(runs.id, runId), eq(runs.userId, auth.userId)));

    if (!run) {
      return Response.json({ error: "Run not found" }, { status: 404 });
    }

    const runSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.runId, runId))
      .orderBy(asc(sessions.createdAt));

    const runNotes = await db
      .select()
      .from(notes)
      .where(eq(notes.runId, runId))
      .orderBy(asc(notes.createdAt));

    return Response.json({ ...run, sessions: runSessions, notes: runNotes });
  }

  if (req.method === "PATCH") {
    const body = await req.json();
    const { archived } = body;

    const [existingRun] = await db.select().from(runs).where(and(eq(runs.id, runId), eq(runs.userId, auth.userId)));
    if (!existingRun) {
      return Response.json({ error: "Run not found" }, { status: 404 });
    }

    const now = new Date();
    const updates: Partial<typeof runs.$inferInsert> = { updatedAt: now };

    if (archived === true) {
      updates.archivedAt = now;
    } else if (archived === false) {
      updates.archivedAt = null;
    }

    await db.update(runs).set(updates).where(eq(runs.id, runId));

    const [run] = await db.select().from(runs).where(eq(runs.id, runId));
    return Response.json(run);
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: "/api/runs/:id",
};
