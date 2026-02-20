import { useEffect, useCallback } from "react";
import { useKanbanStore } from "../store/kanbanStore";
import {
  fetchRuns,
  createRun as apiCreateRun,
  archiveRun as apiArchiveRun,
  unarchiveRun as apiUnarchiveRun,
  addSession as apiAddSession,
  createPullRequest as apiCreatePullRequest,
  updatePullRequest as apiUpdatePullRequest,
  mergePullRequest as apiMergePullRequest,
} from "../api/runsApi";
import type { CreateRunRequest } from "../types/runs";

export function useRuns() {
  const {
    runs,
    archivedRuns,
    isLoading,
    error,
    setRuns,
    setArchivedRuns,
    setLoading,
    setError,
    addRun,
    updateRun,
    moveToArchive,
    restoreFromArchive,
  } = useKanbanStore();

  const loadRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [activeRuns, archived] = await Promise.all([
        fetchRuns(false),
        fetchRuns(true),
      ]);
      setRuns(activeRuns);
      setArchivedRuns(archived);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load runs");
    } finally {
      setLoading(false);
    }
  }, [setRuns, setArchivedRuns, setLoading, setError]);

  const createRun = useCallback(
    async (data: CreateRunRequest) => {
      const run = await apiCreateRun(data);
      addRun(run);
      return run;
    },
    [addRun]
  );

  const archiveRun = useCallback(
    async (id: string) => {
      const run = await apiArchiveRun(id);
      moveToArchive(id);
      return run;
    },
    [moveToArchive]
  );

  const unarchiveRun = useCallback(
    async (id: string) => {
      const run = await apiUnarchiveRun(id);
      restoreFromArchive(run);
      return run;
    },
    [restoreFromArchive]
  );

  const addSession = useCallback(
    async (runId: string, prompt: string): Promise<void> => {
      await apiAddSession(runId, { prompt });
      // Reload runs to get updated state
      await loadRuns();
    },
    [loadRuns]
  );

  const createPullRequest = useCallback(
    async (runId: string) => {
      const run = await apiCreatePullRequest(runId);
      updateRun(run);
      return run;
    },
    [updateRun]
  );

  const updatePullRequest = useCallback(
    async (runId: string) => {
      const run = await apiUpdatePullRequest(runId);
      updateRun(run);
      return run;
    },
    [updateRun]
  );

  const mergePullRequest = useCallback(
    async (runId: string) => {
      const run = await apiMergePullRequest(runId);
      updateRun(run);
      return run;
    },
    [updateRun]
  );

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  return {
    runs,
    archivedRuns,
    isLoading,
    error,
    loadRuns,
    createRun,
    archiveRun,
    unarchiveRun,
    addSession,
    createPullRequest,
    updatePullRequest,
    mergePullRequest,
  };
}
