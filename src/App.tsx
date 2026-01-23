import { useEffect } from "react";
import { useKanbanStore } from "./store/kanbanStore";
import { useRuns } from "./hooks/useRuns";
import { useSyncStatus } from "./hooks/useSyncStatus";
import { Header } from "./components/layout/Header";
import { KanbanBoard } from "./components/kanban/KanbanBoard";
import { ArchiveView } from "./components/archive/ArchiveView";
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Loading runs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <main className="p-6">
        {error && (
          <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {view === "kanban" ? (
          <KanbanBoard
            runs={runs}
            onArchive={archiveRun}
            onCreatePR={createPullRequest}
            onAddSession={addSession}
          />
        ) : (
          <ArchiveView
            runs={archivedRuns}
            onUnarchive={unarchiveRun}
          />
        )}
      </main>

      <CreateRunModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onCreateRun={createRun}
      />
    </div>
  );
}

export default App;
