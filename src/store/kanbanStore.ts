import { create } from "zustand";
import type { Run, Site, SyncState } from "../types/runs";

type View = "kanban" | "archive" | "settings";

interface KanbanState {
  // Data
  runs: Run[];
  archivedRuns: Run[];
  sites: Site[];
  syncState: SyncState | null;

  // UI State
  view: View;
  isLoading: boolean;
  error: string | null;
  isCreateModalOpen: boolean;
  selectedRunId: string | null;
  lastUsedSiteId: string | null;

  // Actions
  setRuns: (runs: Run[]) => void;
  setArchivedRuns: (runs: Run[]) => void;
  addRun: (run: Run) => void;
  updateRun: (run: Run) => void;
  moveToArchive: (runId: string) => void;
  restoreFromArchive: (run: Run) => void;

  setSites: (sites: Site[]) => void;
  setSyncState: (state: SyncState) => void;

  setView: (view: View) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  selectRun: (runId: string | null) => void;
  setLastUsedSiteId: (siteId: string) => void;
}

export const useKanbanStore = create<KanbanState>((set) => ({
  // Initial Data
  runs: [],
  archivedRuns: [],
  sites: [],
  syncState: null,

  // Initial UI State
  view: "kanban",
  isLoading: true,
  error: null,
  isCreateModalOpen: false,
  selectedRunId: null,
  lastUsedSiteId: localStorage.getItem("lastUsedSiteId"),

  // Actions
  setRuns: (runs) => set({ runs }),
  setArchivedRuns: (runs) => set({ archivedRuns: runs }),
  addRun: (run) =>
    set((state) => ({
      runs: [run, ...state.runs],
    })),
  updateRun: (run) =>
    set((state) => ({
      runs: state.runs.map((r) => (r.id === run.id ? run : r)),
    })),
  moveToArchive: (runId) =>
    set((state) => {
      const run = state.runs.find((r) => r.id === runId);
      if (!run) return state;
      return {
        runs: state.runs.filter((r) => r.id !== runId),
        archivedRuns: [{ ...run, archivedAt: new Date().toISOString() }, ...state.archivedRuns],
      };
    }),
  restoreFromArchive: (run) =>
    set((state) => ({
      archivedRuns: state.archivedRuns.filter((r) => r.id !== run.id),
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
}));
