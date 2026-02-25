import { useEffect, useCallback } from "react";
import { useKanbanStore } from "../store/kanbanStore";
import {
  fetchRuns,
  createRun as apiCreateRun,
  completeRun as apiCompleteRun,
  uncompleteRun as apiUncompleteRun,
  addSession as apiAddSession,
  createPullRequest as apiCreatePullRequest,
  updatePullRequest as apiUpdatePullRequest,
  mergePullRequest as apiMergePullRequest,
} from "../api/runsApi";
import type { CreateRunRequest } from "../types/runs";

export function useRuns() {
  const {
    runs,
    completedRuns,
    isLoading,
    error,
    setRuns,
    setCompletedRuns,
    setLoading,
    setError,
    addRun,
    updateRun,
    moveToCompleted,
    restoreFromCompleted,
  } = useKanbanStore();

  const loadRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [activeRuns, completed] = await Promise.all([
        fetchRuns(false),
        fetchRuns(true),
      ]);
      setRuns(activeRuns);
      setCompletedRuns(completed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load runs");
    } finally {
      setLoading(false);
    }
  }, [setRuns, setCompletedRuns, setLoading, setError]);

  const createRun = useCallback(
    async (data: CreateRunRequest) => {
      const run = await apiCreateRun(data);
      addRun(run);
      return run;
    },
    [addRun]
  );

  const completeRun = useCallback(
    async (id: string) => {
      const run = await apiCompleteRun(id);
      moveToCompleted(id);
      return run;
    },
    [moveToCompleted]
  );

  const uncompleteRun = useCallback(
    async (id: string) => {
      const run = await apiUncompleteRun(id);
      restoreFromCompleted(run);
      return run;
    },
    [restoreFromCompleted]
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
    completedRuns,
    isLoading,
    error,
    loadRuns,
    createRun,
    completeRun,
    uncompleteRun,
    addSession,
    createPullRequest,
    updatePullRequest,
    mergePullRequest,
  };
}
