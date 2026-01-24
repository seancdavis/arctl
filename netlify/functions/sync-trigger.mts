import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { syncState } from "../../db/schema.ts";
import { eq } from "drizzle-orm";

export default async (req: Request, context: Context) => {
  console.log("[sync-trigger] Received request", { method: req.method });

  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const reset = url.searchParams.get("reset") === "true";
  console.log("[sync-trigger] Reset backoff:", reset);

  // Ensure sync_state row exists
  const [existing] = await db.select().from(syncState).where(eq(syncState.id, 1));
  if (!existing) {
    console.log("[sync-trigger] Creating initial sync_state row");
    await db.insert(syncState).values({
      id: 1,
      backoffSeconds: 30,
      consecutiveNoChange: 0,
    });
  }

  if (reset) {
    console.log("[sync-trigger] Resetting backoff to 30s");
    await db
      .update(syncState)
      .set({ backoffSeconds: 30, consecutiveNoChange: 0 })
      .where(eq(syncState.id, 1));
  }

  // Trigger the background sync worker
  const siteUrl =
    context.site.url || `http://localhost:${Netlify.env.get("PORT") || 8888}`;

  console.log("[sync-trigger] Triggering background worker at", siteUrl);
  try {
    await fetch(`${siteUrl}/.netlify/functions/sync-worker-background`, {
      method: "POST",
    });
    console.log("[sync-trigger] Background worker triggered successfully");
  } catch (error) {
    console.error("[sync-trigger] Failed to trigger sync worker:", error);
  }

  // Get current sync state
  const [state] = await db.select().from(syncState).where(eq(syncState.id, 1));
  console.log("[sync-trigger] Current sync state:", state);

  return new Response(
    JSON.stringify({
      message: "Sync triggered",
      sync_state: state,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
};

export const config: Config = {
  path: "/api/sync/trigger",
};
