import { db } from "../../../db/index.ts";
import { syncState } from "../../../db/schema.ts";
import { eq } from "drizzle-orm";

const STALE_THRESHOLD_MS = 60_000; // 60 seconds
const COOLDOWN_MS = 30_000; // 30 seconds after triggering

interface MaybeSyncOptions {
  origin: string;
  accessToken: string;
  force?: boolean;
}

export async function maybeSync({ origin, accessToken, force }: MaybeSyncOptions): Promise<void> {
  const now = new Date();

  const [state] = await db.select().from(syncState).where(eq(syncState.id, 1));

  if (!state) {
    // No sync state row — create one and trigger
    console.log("[maybeSync] No sync state row, creating and triggering");
    await db.insert(syncState).values({
      id: 1,
      backoffSeconds: 30,
      consecutiveNoChange: 0,
      nextSyncAt: new Date(now.getTime() + COOLDOWN_MS),
    });
    triggerWorker(origin, accessToken);
    return;
  }

  if (force) {
    console.log("[maybeSync] Force sync requested, resetting backoff");
    await db
      .update(syncState)
      .set({
        backoffSeconds: 30,
        consecutiveNoChange: 0,
        nextSyncAt: new Date(now.getTime() + COOLDOWN_MS),
      })
      .where(eq(syncState.id, 1));
    triggerWorker(origin, accessToken);
    return;
  }

  // Staleness check: lastSyncAt > 60s ago
  const isStale = !state.lastSyncAt || now.getTime() - state.lastSyncAt.getTime() > STALE_THRESHOLD_MS;

  // Overdue check: nextSyncAt is in the past
  const isOverdue = state.nextSyncAt && state.nextSyncAt.getTime() < now.getTime();

  if (isStale || isOverdue) {
    console.log(`[maybeSync] Triggering sync (stale: ${isStale}, overdue: ${isOverdue})`);
    await db
      .update(syncState)
      .set({ nextSyncAt: new Date(now.getTime() + COOLDOWN_MS) })
      .where(eq(syncState.id, 1));
    triggerWorker(origin, accessToken);
  }
}

function triggerWorker(origin: string, accessToken: string): void {
  // Fire-and-forget — don't await
  fetch(`${origin}/api/sync/worker`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  }).catch((err) => {
    console.error("[maybeSync] Failed to trigger sync worker:", err);
  });
}
