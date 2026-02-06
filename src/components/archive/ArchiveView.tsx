import type { Run } from "../../types/runs";
import { Skeleton } from "../ui/Skeleton";

interface ArchiveViewProps {
  runs: Run[];
  isLoading: boolean;
  onUnarchive: (id: string) => void;
}

export function ArchiveView({ runs, isLoading, onUnarchive }: ArchiveViewProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "DONE":
        return "bg-[var(--accent-green)]/10 text-[var(--accent-green)]";
      case "ERROR":
        return "bg-[var(--accent-red)]/10 text-[var(--accent-red)]";
      case "ARCHIVED":
        return "bg-[var(--surface-4)] text-[var(--text-secondary)]";
      default:
        return "bg-[var(--surface-4)] text-[var(--text-secondary)]";
    }
  };

  if (!isLoading && runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--text-secondary)]">
        <svg
          className="w-16 h-16 mb-4 text-[var(--text-tertiary)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-1">
          No Archived Runs
        </h3>
        <p className="text-sm">
          Archived runs will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface-2)] rounded-lg border border-[var(--border)] overflow-hidden">
      <table className="min-w-full divide-y divide-[var(--border)]">
        <thead className="bg-[var(--surface-3)]">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              Title
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              Site
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              State
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              Archived
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              Links
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                <td className="px-6 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                <td className="px-6 py-4"><Skeleton className="h-4 w-12" /></td>
                <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
              </tr>
            ))
          ) : runs.map((run) => (
            <tr key={run.id} className="hover:bg-[var(--surface-3)]/50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-[var(--text-primary)] max-w-xs truncate">
                  {run.title || "Untitled Run"}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-[var(--text-secondary)]">
                  {run.siteName || "Unknown"}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getStateColor(
                    run.state
                  )}`}
                >
                  {run.state}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                {formatDate(run.createdAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                {run.archivedAt ? formatDate(run.archivedAt) : "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="flex gap-2">
                  {run.pullRequestUrl && (
                    <a
                      href={run.pullRequestUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent-blue)] hover:brightness-125"
                    >
                      PR
                    </a>
                  )}
                  {run.deployPreviewUrl && (
                    <a
                      href={run.deployPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent-green)] hover:brightness-125"
                    >
                      Preview
                    </a>
                  )}
                  {!run.pullRequestUrl && !run.deployPreviewUrl && (
                    <span className="text-[var(--text-tertiary)]">-</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                <button
                  onClick={() => onUnarchive(run.id)}
                  className="text-[var(--accent-blue)] hover:brightness-125 font-medium"
                >
                  Restore
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
