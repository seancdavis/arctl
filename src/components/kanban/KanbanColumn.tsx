import type { Run, KanbanColumn as ColumnType } from "../../types/runs";
import { COLUMN_CONFIG } from "../../types/runs";
import { KanbanCard } from "./KanbanCard";
import { Skeleton } from "../ui/Skeleton";

interface KanbanColumnProps {
  column: ColumnType;
  runs: Run[];
  isLoading: boolean;
}

function SkeletonCard() {
  return (
    <div className="bg-[var(--surface-2)] rounded-lg p-3 space-y-2.5">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}

export function KanbanColumn({
  column,
  runs,
  isLoading,
}: KanbanColumnProps) {
  const config = COLUMN_CONFIG[column];

  return (
    <div className="flex-shrink-0 w-72">
      <div
        className={`rounded-t-lg px-3 py-2 ${config.color} border-b-2`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text-primary)]">{config.title}</h2>
          {isLoading ? (
            <Skeleton className="h-5 w-6 rounded-full" />
          ) : (
            <span className="text-sm text-[var(--text-secondary)] bg-black/20 px-2 py-0.5 rounded-full">
              {runs.length}
            </span>
          )}
        </div>
      </div>
      <div className="bg-[var(--surface-1)] rounded-b-lg p-2 space-y-2">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : runs.length === 0 ? (
          <div className="text-center text-[var(--text-tertiary)] text-sm py-8">
            No runs
          </div>
        ) : (
          runs.map((run) => (
            <KanbanCard
              key={run.id}
              run={run}
            />
          ))
        )}
      </div>
    </div>
  );
}
