import { useKanbanStore } from "../../store/kanbanStore";
import { SyncStatus } from "../sync/SyncStatus";
import { ViewToggle } from "./ViewToggle";

export function Header() {
  const { openCreateModal } = useKanbanStore();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">
            Agent Runner Kanban
          </h1>
          <ViewToggle />
        </div>

        <div className="flex items-center gap-4">
          <SyncStatus />
          <button
            onClick={openCreateModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
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
            New Run
          </button>
        </div>
      </div>
    </header>
  );
}
