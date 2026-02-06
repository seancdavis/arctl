import { useKanbanStore } from "../../store/kanbanStore";

export function ViewToggle() {
  const { view, setView, archivedRuns } = useKanbanStore();

  return (
    <div className="flex bg-[var(--surface-3)] rounded-lg p-1">
      <button
        onClick={() => setView("kanban")}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          view === "kanban"
            ? "bg-[var(--surface-4)] text-[var(--text-primary)] shadow-sm"
            : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        }`}
      >
        Board
      </button>
      <button
        onClick={() => setView("archive")}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
          view === "archive"
            ? "bg-[var(--surface-4)] text-[var(--text-primary)] shadow-sm"
            : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        }`}
      >
        Archive
        {archivedRuns.length > 0 && (
          <span className="bg-[var(--surface-2)] text-[var(--text-tertiary)] text-xs px-1.5 py-0.5 rounded-full">
            {archivedRuns.length}
          </span>
        )}
      </button>
      <button
        onClick={() => setView("settings")}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          view === "settings"
            ? "bg-[var(--surface-4)] text-[var(--text-primary)] shadow-sm"
            : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        }`}
      >
        Settings
      </button>
    </div>
  );
}
