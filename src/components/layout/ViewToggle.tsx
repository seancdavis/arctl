import { useKanbanStore } from "../../store/kanbanStore";

export function ViewToggle() {
  const { view, setView, archivedRuns } = useKanbanStore();

  return (
    <div className="flex bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => setView("kanban")}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          view === "kanban"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        Board
      </button>
      <button
        onClick={() => setView("archive")}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
          view === "archive"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        Archive
        {archivedRuns.length > 0 && (
          <span className="bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
            {archivedRuns.length}
          </span>
        )}
      </button>
    </div>
  );
}
