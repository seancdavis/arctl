import type { Context, Config } from "@netlify/functions";
import { sql, runMigrations } from "./lib/db.mts";
import type { Run, NetlifyAgentRun, SyncState } from "./lib/types.mts";

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
  await runMigrations();

  const pat = Netlify.env.get("NETLIFY_PAT");
  if (!pat) {
    console.error("NETLIFY_PAT not configured");
    return;
  }

  console.log("Starting sync...");

  // Get all non-archived runs from our DB
  const runs: Run[] = await sql`
    SELECT * FROM runs
    WHERE archived_at IS NULL
    ORDER BY created_at DESC
  `;

  // Get unique site IDs
  const siteIds = [...new Set(runs.map((r) => r.site_id))];

  let anyStateChanged = false;

  // Fetch runs from Netlify API for each site
  for (const siteId of siteIds) {
    try {
      const res = await fetch(
        `https://api.netlify.com/api/v1/sites/${siteId}/agent/runs`,
        {
          headers: { Authorization: `Bearer ${pat}` },
        }
      );

      if (!res.ok) {
        console.error(`Failed to fetch runs for site ${siteId}: ${res.status}`);
        continue;
      }

      const netlifyRuns: NetlifyAgentRun[] = await res.json();
      const now = new Date().toISOString();

      for (const netlifyRun of netlifyRuns) {
        // Check if we have this run
        const [existingRun]: Run[] = await sql`
          SELECT * FROM runs WHERE id = ${netlifyRun.id}
        `;

        if (existingRun) {
          // Check if state changed
          const stateChanged = existingRun.state !== netlifyRun.state;
          const prChanged =
            existingRun.pull_request_url !== netlifyRun.pull_request_url;
          const previewChanged =
            existingRun.deploy_preview_url !== netlifyRun.deploy_preview_url;

          if (stateChanged || prChanged || previewChanged) {
            anyStateChanged = true;

            await sql`
              UPDATE runs SET
                state = ${netlifyRun.state || existingRun.state},
                title = ${netlifyRun.title || existingRun.title},
                branch = ${netlifyRun.branch || existingRun.branch},
                pull_request_url = ${netlifyRun.pull_request_url || existingRun.pull_request_url},
                deploy_preview_url = ${netlifyRun.deploy_preview_url || existingRun.deploy_preview_url},
                updated_at = ${netlifyRun.updated_at || now},
                synced_at = ${now}
              WHERE id = ${netlifyRun.id}
            `;

            console.log(`Updated run ${netlifyRun.id}: ${existingRun.state} -> ${netlifyRun.state}`);
          } else {
            // Just update synced_at
            await sql`
              UPDATE runs SET synced_at = ${now}
              WHERE id = ${netlifyRun.id}
            `;
          }
        } else {
          // New run found - insert it
          anyStateChanged = true;

          // Get site name
          const siteRes = await fetch(
            `https://api.netlify.com/api/v1/sites/${siteId}`,
            {
              headers: { Authorization: `Bearer ${pat}` },
            }
          );
          const site = siteRes.ok ? await siteRes.json() : null;

          await sql`
            INSERT INTO runs (
              id, site_id, site_name, title, state, branch,
              pull_request_url, deploy_preview_url, created_at, updated_at, synced_at
            ) VALUES (
              ${netlifyRun.id},
              ${siteId},
              ${site?.name || null},
              ${netlifyRun.title || null},
              ${netlifyRun.state || "NEW"},
              ${netlifyRun.branch || null},
              ${netlifyRun.pull_request_url || null},
              ${netlifyRun.deploy_preview_url || null},
              ${netlifyRun.created_at || now},
              ${netlifyRun.updated_at || now},
              ${now}
            )
          `;

          console.log(`Inserted new run ${netlifyRun.id}`);
        }

        // Sync sessions for this run
        try {
          const sessionsRes = await fetch(
            `https://api.netlify.com/api/v1/sites/${siteId}/agent/runs/${netlifyRun.id}/sessions`,
            {
              headers: { Authorization: `Bearer ${pat}` },
            }
          );

          if (sessionsRes.ok) {
            const sessions = await sessionsRes.json();
            for (const session of sessions) {
              const [existingSession] = await sql`
                SELECT * FROM sessions WHERE id = ${session.id}
              `;

              if (!existingSession) {
                await sql`
                  INSERT INTO sessions (id, run_id, state, prompt, created_at, updated_at)
                  VALUES (
                    ${session.id},
                    ${netlifyRun.id},
                    ${session.state || "NEW"},
                    ${session.prompt || null},
                    ${session.created_at || now},
                    ${session.updated_at || now}
                  )
                `;
              } else if (existingSession.state !== session.state) {
                await sql`
                  UPDATE sessions SET
                    state = ${session.state},
                    updated_at = ${session.updated_at || now}
                  WHERE id = ${session.id}
                `;
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
  const [syncState]: SyncState[] = await sql`SELECT * FROM sync_state WHERE id = 1`;
  const now = new Date().toISOString();

  let newConsecutiveNoChange = anyStateChanged
    ? 0
    : (syncState?.consecutive_no_change || 0) + 1;

  const newBackoffSeconds = getBackoffSeconds(newConsecutiveNoChange);
  const nextSyncAt = new Date(Date.now() + newBackoffSeconds * 1000).toISOString();

  await sql`
    UPDATE sync_state SET
      last_sync_at = ${now},
      next_sync_at = ${nextSyncAt},
      backoff_seconds = ${newBackoffSeconds},
      consecutive_no_change = ${newConsecutiveNoChange}
    WHERE id = 1
  `;

  console.log(`Sync complete. State changed: ${anyStateChanged}. Next sync in ${newBackoffSeconds}s`);

  // Check if there are still active runs
  const activeRuns = await sql`
    SELECT COUNT(*) as count FROM runs
    WHERE archived_at IS NULL
    AND state IN ('NEW', 'RUNNING')
  `;

  const hasActiveRuns = activeRuns[0].count > 0;

  if (hasActiveRuns) {
    // Schedule next sync by calling ourselves after backoff delay
    const siteUrl = context.site.url || `http://localhost:${Netlify.env.get("PORT") || 8888}`;

    console.log(`Active runs exist. Scheduling next sync in ${newBackoffSeconds}s`);

    // Use setTimeout equivalent by waiting
    // Note: In production, you might want to use a more robust scheduling mechanism
    // For now, we'll just log that we would schedule
    // The client will trigger syncs on load anyway
  } else {
    console.log("No active runs. Stopping sync loop.");
  }
};

export const config: Config = {
  // Background functions don't need a path - they're called internally
};
