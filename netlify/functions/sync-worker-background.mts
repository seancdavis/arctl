import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { runs, sessions, syncState } from "../../db/schema.ts";
import { eq, isNull, inArray } from "drizzle-orm";

// Backoff schedule in seconds
const BACKOFF_SCHEDULE = [
  30, // 0: 30 seconds
  60, // 1: 1 minute
  120, // 2: 2 minutes
  300, // 3: 5 minutes
  900, // 4: 15 minutes
  1800, // 5: 30 minutes
  3600, // 6: 1 hour
  7200, // 7: 2 hours
  21600, // 8: 6 hours
  43200, // 9: 12 hours
  86400, // 10: 1 day
  345600, // 11+: 4 days (cap)
];

function getBackoffSeconds(consecutiveNoChange: number): number {
  const index = Math.min(consecutiveNoChange, BACKOFF_SCHEDULE.length - 1);
  return BACKOFF_SCHEDULE[index];
}

export default async (req: Request, context: Context) => {
  const pat = Netlify.env.get("NETLIFY_PAT");
  if (!pat) {
    console.error("NETLIFY_PAT not configured");
    return;
  }

  console.log("Starting sync...");

  // Get all non-archived runs from our DB
  const dbRuns = await db
    .select()
    .from(runs)
    .where(isNull(runs.archivedAt));

  // Get unique site IDs
  const siteIds = [...new Set(dbRuns.map((r) => r.siteId))];

  let anyStateChanged = false;

  // Fetch runs from Netlify API for each site
  for (const siteId of siteIds) {
    try {
      const res = await fetch(
        `https://api.netlify.com/api/v1/sites/${siteId}/agent/runs`,
        { headers: { Authorization: `Bearer ${pat}` } }
      );

      if (!res.ok) {
        console.error(`Failed to fetch runs for site ${siteId}: ${res.status}`);
        continue;
      }

      const netlifyRuns = await res.json();
      const now = new Date();

      for (const netlifyRun of netlifyRuns) {
        const [existingRun] = await db
          .select()
          .from(runs)
          .where(eq(runs.id, netlifyRun.id));

        if (existingRun) {
          const stateChanged = existingRun.state !== netlifyRun.state;
          const prChanged =
            existingRun.pullRequestUrl !== netlifyRun.pull_request_url;
          const previewChanged =
            existingRun.deployPreviewUrl !== netlifyRun.deploy_preview_url;

          if (stateChanged || prChanged || previewChanged) {
            anyStateChanged = true;

            await db
              .update(runs)
              .set({
                state: netlifyRun.state || existingRun.state,
                title: netlifyRun.title || existingRun.title,
                branch: netlifyRun.branch || existingRun.branch,
                pullRequestUrl:
                  netlifyRun.pull_request_url || existingRun.pullRequestUrl,
                deployPreviewUrl:
                  netlifyRun.deploy_preview_url || existingRun.deployPreviewUrl,
                updatedAt: netlifyRun.updated_at
                  ? new Date(netlifyRun.updated_at)
                  : now,
                syncedAt: now,
              })
              .where(eq(runs.id, netlifyRun.id));

            console.log(
              `Updated run ${netlifyRun.id}: ${existingRun.state} -> ${netlifyRun.state}`
            );
          } else {
            await db
              .update(runs)
              .set({ syncedAt: now })
              .where(eq(runs.id, netlifyRun.id));
          }
        } else {
          // New run found - insert it
          anyStateChanged = true;

          const siteRes = await fetch(
            `https://api.netlify.com/api/v1/sites/${siteId}`,
            { headers: { Authorization: `Bearer ${pat}` } }
          );
          const site = siteRes.ok ? await siteRes.json() : null;

          await db.insert(runs).values({
            id: netlifyRun.id,
            siteId: siteId,
            siteName: site?.name || null,
            title: netlifyRun.title || null,
            state: netlifyRun.state || "NEW",
            branch: netlifyRun.branch || null,
            pullRequestUrl: netlifyRun.pull_request_url || null,
            deployPreviewUrl: netlifyRun.deploy_preview_url || null,
            createdAt: netlifyRun.created_at
              ? new Date(netlifyRun.created_at)
              : now,
            updatedAt: netlifyRun.updated_at
              ? new Date(netlifyRun.updated_at)
              : now,
            syncedAt: now,
          });

          console.log(`Inserted new run ${netlifyRun.id}`);
        }

        // Sync sessions for this run
        try {
          const sessionsRes = await fetch(
            `https://api.netlify.com/api/v1/sites/${siteId}/agent/runs/${netlifyRun.id}/sessions`,
            { headers: { Authorization: `Bearer ${pat}` } }
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
                  createdAt: session.created_at
                    ? new Date(session.created_at)
                    : now,
                  updatedAt: session.updated_at
                    ? new Date(session.updated_at)
                    : now,
                });
              } else if (existingSession.state !== session.state) {
                await db
                  .update(sessions)
                  .set({
                    state: session.state,
                    updatedAt: session.updated_at
                      ? new Date(session.updated_at)
                      : now,
                  })
                  .where(eq(sessions.id, session.id));
              }
            }
          }
        } catch (e) {
          console.error(`Failed to sync sessions for run ${netlifyRun.id}:`, e);
        }
      }
    } catch (e) {
      console.error(`Failed to sync site ${siteId}:`, e);
    }
  }

  // Update sync state
  const [currentSyncState] = await db
    .select()
    .from(syncState)
    .where(eq(syncState.id, 1));

  const now = new Date();
  const newConsecutiveNoChange = anyStateChanged
    ? 0
    : (currentSyncState?.consecutiveNoChange || 0) + 1;

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

  console.log(
    `Sync complete. State changed: ${anyStateChanged}. Next sync in ${newBackoffSeconds}s`
  );

  // Check if there are still active runs
  const activeRuns = await db
    .select()
    .from(runs)
    .where(isNull(runs.archivedAt));

  const hasActiveRuns = activeRuns.some(
    (r) => r.state === "NEW" || r.state === "RUNNING"
  );

  if (hasActiveRuns) {
    console.log(`Active runs exist. Next sync scheduled in ${newBackoffSeconds}s`);
  } else {
    console.log("No active runs. Stopping sync loop.");
  }
};

export const config: Config = {
  // Background functions don't need a path
};
