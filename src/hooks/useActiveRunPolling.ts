import { useEffect, useRef } from "react";
import { useKanbanStore } from "../store/kanbanStore";
import { syncRun } from "../api/runsApi";

const POLL_INTERVAL_MS = 15_000; // 15s

/**
 * Polls individual NEW/RUNNING runs every 15s to detect state changes.
 * Updates the Zustand store when a run's state changes so the card
 * moves to the correct kanban column in near-real-time.
 */
export function useActiveRunPolling() {
  const runs = useKanbanStore((s) => s.runs);
  const updateRun = useKanbanStore((s) => s.updateRun);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const activeRunIds = runs
      .filter((r) => (r.state === "NEW" || r.state === "RUNNING") && !r.archivedAt)
      .map((r) => r.id);

    if (activeRunIds.length === 0) return;

    const poll = async () => {
      for (const id of activeRunIds) {
        try {
          const fresh = await syncRun(id);
          // Update the store with fresh run data (sessions stripped)
          const { sessions: _, ...runData } = fresh as any;
          updateRun(runData);
        } catch {
          // Silently ignore — run may have been archived or deleted
        }
      }
    };

    const schedule = () => {
      timerRef.current = setTimeout(async () => {
        await poll();
        schedule();
      }, POLL_INTERVAL_MS);
    };

    schedule();
    return () => clearTimeout(timerRef.current);
  }, [runs, updateRun]);
}
