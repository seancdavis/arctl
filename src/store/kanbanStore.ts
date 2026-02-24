import { create } from "zustand";
import type { Run, Site, SyncState } from "../types/runs";

interface KanbanState {
  // Data
  runs: Run[];
  completedRuns: Run[];
  sites: Site[];
  syncState: SyncState | null;

  // UI State
  view: "kanban" | "completed" | "settings";
  isLoading: boolean;
  error: string | null;
  isCreateModalOpen: boolean;
  selectedRunId: string | null;
  lastUsedSiteId: string | null;
  filterSiteId: string | null;

  // Actions
  setRuns: (runs: Run[]) => void;
  setCompletedRuns: (runs: Run[]) => void;
  addRun: (run: Run) => void;
  updateRun: (run: Run) => void;
  moveToCompleted: (runId: string) => void;
  restoreFromCompleted: (run: Run) => void;

  setSites: (sites: Site[]) => void;
  setSyncState: (state: SyncState) => void;

  setView: (view: "kanban" | "completed" | "settings") => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  selectRun: (runId: string | null) => void;
  setLastUsedSiteId: (siteId: string) => void;
  setFilterSiteId: (siteId: string | null) => void;
}

export const useKanbanStore = create<KanbanState>((set) => ({
  // Initial Data
  runs: [],
  completedRuns: [],
  sites: [],
  syncState: null,

  // Initial UI State
  view: "kanban",
  isLoading: true,
  error: null,
  isCreateModalOpen: false,
  selectedRunId: null,
  lastUsedSiteId: localStorage.getItem("lastUsedSiteId"),
  filterSiteId: localStorage.getItem("filterSiteId"),

  // Actions
  setRuns: (runs) => set({ runs }),
  setCompletedRuns: (runs) => set({ completedRuns: runs }),
  addRun: (run) =>
    set((state) => ({
      runs: [run, ...state.runs],
    })),
  updateRun: (run) =>
    set((state) => ({
      runs: state.runs.map((r) => (r.id === run.id ? run : r)),
    })),
  moveToCompleted: (runId) =>
    set((state) => {
      const run = state.runs.find((r) => r.id === runId);
      if (!run) return state;
      return {
        runs: state.runs.filter((r) => r.id !== runId),
        completedRuns: [{ ...run, completedAt: new Date().toISOString() }, ...state.completedRuns],
      };
    }),
  restoreFromCompleted: (run) =>
    set((state) => ({
      completedRuns: state.completedRuns.filter((r) => r.id !== run.id),
      runs: [run, ...state.runs],
    })),

  setSites: (sites) => set({ sites }),
  setSyncState: (syncState) => set({ syncState }),

  setView: (view) => set({ view }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
  selectRun: (selectedRunId) => set({ selectedRunId }),
  setLastUsedSiteId: (siteId) => {
    localStorage.setItem("lastUsedSiteId", siteId);
    set({ lastUsedSiteId: siteId });
  },
  setFilterSiteId: (siteId) => {
    if (siteId) {
      localStorage.setItem("filterSiteId", siteId);
    } else {
      localStorage.removeItem("filterSiteId");
    }
    set({ filterSiteId: siteId });
  },
}));
