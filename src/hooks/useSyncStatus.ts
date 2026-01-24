import { useCallback, useState } from "react";
import { useKanbanStore } from "../store/kanbanStore";
import { triggerSync } from "../api/syncApi";
import { fetchRuns } from "../api/runsApi";

export function useSyncStatus() {
  const { syncState, setSyncState, setRuns, setArchivedRuns, setError } =
    useKanbanStore();
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = useCallback(
    async (reset = true) => {
      setIsSyncing(true);
      try {
        // Trigger sync on the backend
        const response = await triggerSync(reset);
        setSyncState(response.sync_state);

        // Wait a moment for background sync to process, then reload runs
        await new Promise((resolve) => setTimeout(resolve, 1000));

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

  const formatLastSync = () => {
    if (!syncState?.lastSyncAt) return "Never";
    const date = new Date(syncState.lastSyncAt);
    return date.toLocaleTimeString();
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
