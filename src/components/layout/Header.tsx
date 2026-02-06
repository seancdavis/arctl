import { useKanbanStore } from "../../store/kanbanStore";
import { SyncStatus } from "../sync/SyncStatus";

export function Header() {
  const { openCreateModal } = useKanbanStore();

  return (
    <header className="bg-[var(--surface-1)] border-b border-[var(--border)] px-4 md:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg md:text-xl font-bold text-[var(--text-primary)] truncate">
          Agent Runner Kanban
        </h1>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <div className="hidden sm:block">
            <SyncStatus />
          </div>
          <button
            onClick={openCreateModal}
            className="btn-neon px-3 md:px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="hidden sm:inline">New Run</span>
          </button>
        </div>
      </div>
    </header>
  );
}
