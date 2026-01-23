import type { Context, Config } from "@netlify/functions";
import { sql, runMigrations } from "./lib/db.mts";

export default async (req: Request, context: Context) => {
  await runMigrations();

  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const reset = url.searchParams.get("reset") === "true";

  if (reset) {
    // User manually triggered refresh - reset backoff to 30s
    await sql`
      UPDATE sync_state SET
        backoff_seconds = 30,
        consecutive_no_change = 0
      WHERE id = 1
    `;
  }

  // Trigger the background sync worker
  const siteUrl = context.site.url || `http://localhost:${Netlify.env.get("PORT") || 8888}`;

  try {
    // Call the background function to do the actual sync
    await fetch(`${siteUrl}/.netlify/functions/sync-worker-background`, {
      method: "POST",
    });
  } catch (error) {
    console.error("Failed to trigger sync worker:", error);
  }

  // Get current sync state
  const [syncState] = await sql`SELECT * FROM sync_state WHERE id = 1`;

  return new Response(
    JSON.stringify({
      message: "Sync triggered",
      sync_state: syncState,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
};

export const config: Config = {
  path: "/api/sync/trigger",
};
