import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { runs, sessions, sites, syncState } from "../../db/schema.ts";
import { eq, isNull } from "drizzle-orm";

// Backoff schedule in seconds
const BACKOFF_SCHEDULE = [
  30, 60, 120, 300, 900, 1800, 3600, 7200, 21600, 43200, 86400, 345600,
];

function getBackoffSeconds(consecutiveNoChange: number): number {
  const index = Math.min(consecutiveNoChange, BACKOFF_SCHEDULE.length - 1);
  return BACKOFF_SCHEDULE[index];
}

export default async (req: Request, context: Context) => {
  console.log("[sync-worker] Starting sync");

  // Get access token from request body (passed by sync-trigger) or fall back to NETLIFY_PAT
  let accessToken: string | undefined;
  try {
    const body = await req.json();
    accessToken = body.accessToken;
  } catch {
    // No body
  }
  if (!accessToken) {
    accessToken = Netlify.env.get("NETLIFY_PAT") || undefined;
  }

  console.log(`[sync-worker] Token source: ${accessToken ? "provided" : "none"}`);
  if (!accessToken) {
    console.error("[sync-worker] No access token available");
    return;
  }

  // Get all sites with sync enabled
  const enabledSites = await db.select().from(sites).where(eq(sites.syncEnabled, true));
  const siteIds = enabledSites.map((s) => s.id);

  console.log(`[sync-worker] Found ${enabledSites.length} enabled sites to sync`);

  let anyStateChanged = false;
  let runsUpdated = 0;
  let runsInserted = 0;

  for (const siteId of siteIds) {
    try {
      const apiUrl = `https://api.netlify.com/api/v1/agent_runners?site_id=${siteId}`;
      console.log(`[sync-worker] Fetching: ${apiUrl}`);
      const res = await fetch(apiUrl, { headers: { Authorization: `Bearer ${accessToken}` } });

      console.log(`[sync-worker] Response status: ${res.status}`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[sync-worker] Failed to fetch runs for site ${siteId}: ${res.status} ${errorText}`);
        continue;
      }

      const netlifyRuns = await res.json();
      console.log(`[sync-worker] Site ${siteId}: ${netlifyRuns.length} runs from API`);
      if (netlifyRuns.length > 0) {
        console.log(`[sync-worker] First run:`, JSON.stringify(netlifyRuns[0], null, 2));
      }
      const now = new Date();

      for (const netlifyRun of netlifyRuns) {
        const [existingRun] = await db
          .select()
          .from(runs)
          .where(eq(runs.id, netlifyRun.id));

        if (existingRun) {
          const stateChanged = existingRun.state !== (netlifyRun.state || "").toUpperCase();
          const prChanged = existingRun.pullRequestUrl !== netlifyRun.pr_url;
          const prStateChanged = existingRun.pullRequestState !== (netlifyRun.pr_state || null);
          const previewChanged = existingRun.deployPreviewUrl !== netlifyRun.latest_session_deploy_url;

          if (stateChanged || prChanged || prStateChanged || previewChanged) {
            anyStateChanged = true;
            runsUpdated++;

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
              .where(eq(runs.id, netlifyRun.id));

            console.log(`[sync-worker] Updated run ${netlifyRun.id}: ${existingRun.state} -> ${netlifyRun.state}`);
          } else {
            await db.update(runs).set({ syncedAt: now }).where(eq(runs.id, netlifyRun.id));
          }
        } else {
          anyStateChanged = true;
          runsInserted++;

          const siteRes = await fetch(
            `https://api.netlify.com/api/v1/sites/${siteId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const site = siteRes.ok ? await siteRes.json() : null;

          await db.insert(runs).values({
            id: netlifyRun.id,
            siteId: siteId,
            siteName: site?.name || null,
            title: netlifyRun.title || null,
            state: (netlifyRun.state || "NEW").toUpperCase(),
            branch: netlifyRun.branch || null,
            pullRequestUrl: netlifyRun.pr_url || null,
            pullRequestState: netlifyRun.pr_state || null,
            pullRequestBranch: netlifyRun.pr_branch || null,
            deployPreviewUrl: netlifyRun.latest_session_deploy_url || null,
            createdAt: netlifyRun.created_at ? new Date(netlifyRun.created_at) : now,
            updatedAt: netlifyRun.updated_at ? new Date(netlifyRun.updated_at) : now,
            syncedAt: now,
          });

          console.log(`[sync-worker] Inserted new run ${netlifyRun.id} (${netlifyRun.state})`);
        }

        // Sync sessions
        try {
          const sessionsRes = await fetch(
            `https://api.netlify.com/api/v1/agent_runners/${netlifyRun.id}/sessions`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (sessionsRes.ok) {
            const netlifySessionList = await sessionsRes.json();
            for (const session of netlifySessionList) {
              const [existingSession] = await db
                .select()
                .from(sessions)
                .where(eq(sessions.id, session.id));

              if (!existingSession) {
                await db.insert(sessions).values({
                  id: session.id,
                  runId: netlifyRun.id,
                  state: session.state || "NEW",
                  prompt: session.prompt || null,
                  createdAt: session.created_at ? new Date(session.created_at) : now,
                  updatedAt: session.updated_at ? new Date(session.updated_at) : now,
                });
                // If this run has a PR, mark it as needing update
                const prUrl = netlifyRun.pr_url || (existingRun?.pullRequestUrl);
                if (prUrl) {
                  await db.update(runs).set({ prNeedsUpdate: true }).where(eq(runs.id, netlifyRun.id));
                }
              } else if (existingSession.state !== session.state) {
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
        } catch (e) {
          console.error(`[sync-worker] Failed to sync sessions for run ${netlifyRun.id}:`, e);
        }
      }
    } catch (e) {
      console.error(`[sync-worker] Failed to sync site ${siteId}:`, e);
    }
  }

  // Update sync state
  const [currentSyncState] = await db.select().from(syncState).where(eq(syncState.id, 1));
  const now = new Date();
  const newConsecutiveNoChange = anyStateChanged ? 0 : (currentSyncState?.consecutiveNoChange || 0) + 1;
  const newBackoffSeconds = getBackoffSeconds(newConsecutiveNoChange);
  const nextSyncAt = new Date(Date.now() + newBackoffSeconds * 1000);

  if (currentSyncState) {
    await db
      .update(syncState)
      .set({
        lastSyncAt: now,
        nextSyncAt: nextSyncAt,
        backoffSeconds: newBackoffSeconds,
        consecutiveNoChange: newConsecutiveNoChange,
      })
      .where(eq(syncState.id, 1));
  } else {
    await db.insert(syncState).values({
      id: 1,
      lastSyncAt: now,
      nextSyncAt: nextSyncAt,
      backoffSeconds: newBackoffSeconds,
      consecutiveNoChange: newConsecutiveNoChange,
    });
  }

  // Summary
  const activeRuns = await db.select().from(runs).where(isNull(runs.archivedAt));
  const activeCount = activeRuns.filter((r) => r.state === "NEW" || r.state === "RUNNING").length;

  console.log(`[sync-worker] Sync complete: ${runsInserted} inserted, ${runsUpdated} updated, ${activeCount} active runs`);
  console.log(`[sync-worker] Next sync in ${newBackoffSeconds}s (consecutive no-change: ${newConsecutiveNoChange})`);
};

export const config: Config = {
  path: "/api/sync/worker",
};
