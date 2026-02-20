import { useEffect, useMemo } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useKanbanStore } from "./store/kanbanStore";
import { useRuns } from "./hooks/useRuns";
import { useSyncStatus } from "./hooks/useSyncStatus";
import { useActiveRunPolling } from "./hooks/useActiveRunPolling";
import { useAuth } from "./lib/auth";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { KanbanBoard } from "./components/kanban/KanbanBoard";
import { ArchiveView } from "./components/archive/ArchiveView";
import { SettingsView } from "./components/settings/SettingsView";
import { CreateRunModal } from "./components/runs/CreateRunModal";
import { RunDetailPanel } from "./components/runs/RunDetailPanel";
import { LoginPage } from "./pages/LoginPage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { ApiKeysPage } from "./pages/ApiKeysPage";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[var(--surface-0)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <LoginPage />;
  }

  if (status === "not_allowed") {
    return <ComingSoonPage />;
  }

  return <>{children}</>;
}

function AuthenticatedApp() {
  const {
    isCreateModalOpen,
    closeCreateModal,
    isLoading,
    error,
    filterSiteId,
  } = useKanbanStore();

  const {
    runs,
    archivedRuns,
    createRun,
    archiveRun,
    unarchiveRun,
    addSession,
    createPullRequest,
    updatePullRequest,
  } = useRuns();

  const { refresh } = useSyncStatus();

  const filteredRuns = useMemo(() => {
    if (!filterSiteId) return runs;
    return runs.filter((r) => r.siteId === filterSiteId);
  }, [runs, filterSiteId]);

  // Poll individual NEW/RUNNING runs for state changes
  useActiveRunPolling();

  // Trigger sync on app load
  useEffect(() => {
    refresh(false);
  }, [refresh]);

  return (
    <div className="min-h-screen bg-[var(--surface-0)] flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="p-4 md:p-6 flex-1 pb-20 md:pb-6">
          {error && (
            <div className="mb-4 bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/20 px-4 py-3 font-mono text-sm">
              {error}
            </div>
          )}

          <Routes>
            <Route
              path="/"
              element={
                <KanbanBoard runs={filteredRuns} isLoading={isLoading} />
              }
            >
              <Route
                path="runs/:id"
                element={
                  <RunDetailPanel
                    onArchive={archiveRun}
                    onCreatePR={createPullRequest}
                    onUpdatePR={updatePullRequest}
                    onAddSession={addSession}
                  />
                }
              />
            </Route>
            <Route
              path="/archive"
              element={
                <ArchiveView
                  runs={archivedRuns}
                  isLoading={isLoading}
                  onUnarchive={unarchiveRun}
                />
              }
            />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/api-keys" element={<ApiKeysPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
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

function App() {
  return (
    <AuthGate>
      <AuthenticatedApp />
    </AuthGate>
  );
}

export default App;
