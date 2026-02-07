import { useCallback, useEffect, useRef, useState } from "react";
import { useKanbanStore } from "../store/kanbanStore";
import { triggerSync } from "../api/syncApi";
import { fetchRuns } from "../api/runsApi";

const POLL_ACTIVE_MS = 15_000; // 15s when runs are active
const POLL_IDLE_MS = 60_000; // 60s when nothing is running

export function useSyncStatus() {
  const { runs, syncState, setSyncState, setRuns, setArchivedRuns, setError } =
    useKanbanStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const refresh = useCallback(
    async (reset = true) => {
      setIsSyncing(true);
      try {
        // Trigger sync on the backend
        const response = await triggerSync(reset);
        setSyncState(response.sync_state);

        // Wait a moment for background sync to process, then reload runs
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Reload runs from the database
        const [activeRuns, archived] = await Promise.all([
          fetchRuns(false),
          fetchRuns(true),
        ]);
        setRuns(activeRuns);
        setArchivedRuns(archived);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to trigger sync");
      } finally {
        setIsSyncing(false);
      }
    },
    [setSyncState, setRuns, setArchivedRuns, setError]
  );

  // Auto-poll: faster when runs are in progress
  useEffect(() => {
    const hasActiveRuns = runs.some(
      (r) => (r.state === "NEW" || r.state === "RUNNING") && !r.archivedAt
    );
    const interval = hasActiveRuns ? POLL_ACTIVE_MS : POLL_IDLE_MS;

    const schedule = () => {
      timerRef.current = setTimeout(async () => {
        await refresh(false);
        schedule();
      }, interval);
    };

    schedule();
    return () => clearTimeout(timerRef.current);
  }, [runs, refresh]);

  const formatLastSync = () => {
    if (!syncState?.lastSyncAt) return "Never";
    return new Date(syncState.lastSyncAt).toLocaleTimeString();
  };

  const formatNextSync = () => {
    if (!syncState?.nextSyncAt) return null;
    const date = new Date(syncState.nextSyncAt);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    if (diff <= 0) return "Now";
    if (diff < 60000) return `${Math.ceil(diff / 1000)}s`;
    if (diff < 3600000) return `${Math.ceil(diff / 60000)}m`;
    return `${Math.ceil(diff / 3600000)}h`;
  };

  return {
    syncState,
    isSyncing,
    refresh,
    formatLastSync,
    formatNextSync,
  };
}
