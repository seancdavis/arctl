import { useEffect } from "react";
import { useKanbanStore } from "./store/kanbanStore";
import { useRuns } from "./hooks/useRuns";
import { useSyncStatus } from "./hooks/useSyncStatus";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { KanbanBoard } from "./components/kanban/KanbanBoard";
import { ArchiveView } from "./components/archive/ArchiveView";
import { SettingsView } from "./components/settings/SettingsView";
import { CreateRunModal } from "./components/runs/CreateRunModal";

function App() {
  const {
    view,
    isCreateModalOpen,
    closeCreateModal,
    isLoading,
    error,
  } = useKanbanStore();

  const {
    runs,
    archivedRuns,
    createRun,
    archiveRun,
    unarchiveRun,
    addSession,
    createPullRequest,
  } = useRuns();

  const { refresh } = useSyncStatus();

  // Trigger sync on app load
  useEffect(() => {
    refresh(false);
  }, [refresh]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--surface-0)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-secondary)]">Loading runs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-0)] flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="p-6 flex-1">
          {error && (
            <div className="mb-4 bg-red-900/30 text-red-300 border border-red-800/50 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {view === "kanban" && (
            <KanbanBoard
              runs={runs}
              onArchive={archiveRun}
              onCreatePR={createPullRequest}
              onAddSession={addSession}
            />
          )}
          {view === "archive" && (
            <ArchiveView
              runs={archivedRuns}
              onUnarchive={unarchiveRun}
            />
          )}
          {view === "settings" && <SettingsView />}
        </main>

        <CreateRunModal
          isOpen={isCreateModalOpen}
          onClose={closeCreateModal}
          onCreateRun={createRun}
        />
      </div>
    </div>
  );
}

export default App;
