import { useMemo } from "react";
import { Outlet } from "react-router-dom";
import type { Run, KanbanColumn as ColumnType } from "../../types/runs";
import { COLUMN_ORDER, getKanbanColumn } from "../../types/runs";
import { KanbanColumn } from "./KanbanColumn";

interface KanbanBoardProps {
  runs: Run[];
  isLoading: boolean;
}

export function KanbanBoard({ runs, isLoading }: KanbanBoardProps) {
  const columnRuns = useMemo(() => {
    const grouped: Record<ColumnType, Run[]> = {
      new: [],
      running: [],
      done: [],
      pr_open: [],
      pr_merged: [],
      error: [],
    };

    console.log('[KanbanBoard] Processing runs:', runs.length);
    for (const run of runs) {
      const column = getKanbanColumn(run);
      console.log(`[KanbanBoard] Run ${run.id} state="${run.state}" -> column="${column}"`);
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
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMN_ORDER.map((column) => (
          <KanbanColumn
            key={column}
            column={column}
            runs={columnRuns[column]}
            isLoading={isLoading}
          />
        ))}
      </div>
      <Outlet />
    </>
  );
}
