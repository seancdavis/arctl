import { useCallback } from "react";
import { useKanbanStore } from "../store/kanbanStore";
import { triggerSync } from "../api/syncApi";

export function useSyncStatus() {
  const { syncState, setSyncState, setError } = useKanbanStore();

  const refresh = useCallback(
    async (reset = true) => {
      try {
        const response = await triggerSync(reset);
        setSyncState(response.sync_state);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to trigger sync");
      }
    },
    [setSyncState, setError]
  );

  const formatLastSync = () => {
    if (!syncState?.last_sync_at) return "Never";
    const date = new Date(syncState.last_sync_at);
    return date.toLocaleTimeString();
  };

  const formatNextSync = () => {
    if (!syncState?.next_sync_at) return null;
    const date = new Date(syncState.next_sync_at);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    if (diff <= 0) return "Now";
    if (diff < 60000) return `${Math.ceil(diff / 1000)}s`;
    if (diff < 3600000) return `${Math.ceil(diff / 60000)}m`;
    return `${Math.ceil(diff / 3600000)}h`;
  };

  return {
    syncState,
    refresh,
    formatLastSync,
    formatNextSync,
  };
}
