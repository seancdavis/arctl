import { useMemo } from "react";
import type { Run, KanbanColumn as ColumnType } from "../../types/runs";
import { COLUMN_ORDER, getKanbanColumn } from "../../types/runs";
import { KanbanColumn } from "./KanbanColumn";

interface KanbanBoardProps {
  runs: Run[];
  onArchive: (id: string) => void;
  onCreatePR: (id: string) => void;
  onAddSession: (runId: string, prompt: string) => Promise<void>;
}

export function KanbanBoard({
  runs,
  onArchive,
  onCreatePR,
  onAddSession,
}: KanbanBoardProps) {
  const columnRuns = useMemo(() => {
    const grouped: Record<ColumnType, Run[]> = {
      new: [],
      running: [],
      review: [],
      pr_open: [],
      error: [],
    };

    for (const run of runs) {
      const column = getKanbanColumn(run);
      if (column) {
        grouped[column].push(run);
      }
    }

    // Sort each column by createdAt descending
    for (const column of COLUMN_ORDER) {
      grouped[column].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return grouped;
  }, [runs]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMN_ORDER.map((column) => (
        <KanbanColumn
          key={column}
          column={column}
          runs={columnRuns[column]}
          onArchive={onArchive}
          onCreatePR={onCreatePR}
          onAddSession={onAddSession}
        />
      ))}
    </div>
  );
}
