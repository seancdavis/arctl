import type { Run, KanbanColumn as ColumnType } from "../../types/runs";
import { COLUMN_CONFIG } from "../../types/runs";
import { KanbanCard } from "./KanbanCard";

interface KanbanColumnProps {
  column: ColumnType;
  runs: Run[];
  onArchive: (id: string) => void;
  onCreatePR: (id: string) => void;
  onAddSession: (runId: string, prompt: string) => Promise<void>;
}

export function KanbanColumn({
  column,
  runs,
  onArchive,
  onCreatePR,
  onAddSession,
}: KanbanColumnProps) {
  const config = COLUMN_CONFIG[column];

  return (
    <div className="flex-shrink-0 w-72">
      <div
        className={`rounded-t-lg px-3 py-2 ${config.color} border-b-2`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text-primary)]">{config.title}</h2>
          <span className="text-sm text-[var(--text-secondary)] bg-black/20 px-2 py-0.5 rounded-full">
            {runs.length}
          </span>
        </div>
      </div>
      <div className="bg-[var(--surface-1)] rounded-b-lg p-2 min-h-[calc(100vh-220px)] space-y-2">
        {runs.length === 0 ? (
          <div className="text-center text-[var(--text-tertiary)] text-sm py-8">
            No runs
          </div>
        ) : (
          runs.map((run) => (
            <KanbanCard
              key={run.id}
              run={run}
              onArchive={onArchive}
              onCreatePR={onCreatePR}
              onAddSession={onAddSession}
            />
          ))
        )}
      </div>
    </div>
  );
}
