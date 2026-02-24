import { useNavigate } from "react-router-dom";
import type { Run } from "../../types/runs";
import { COPY } from "../../copy";

interface KanbanCardProps {
  run: Run;
}

function extractPrNumber(url: string): string | null {
  const match = url.match(/\/pull\/(\d+)/);
  return match ? match[1] : null;
}

export function KanbanCard({ run }: KanbanCardProps) {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const prNumber = run.pullRequestUrl
    ? extractPrNumber(run.pullRequestUrl)
    : null;

  return (
    <div
      onClick={() => navigate(`/runs/${run.id}`)}
      className="bg-[var(--surface-2)] border border-[var(--border)] border-l-2 border-l-[var(--accent-blue)] p-3 cursor-pointer hover:border-[var(--accent-blue)]/50 hover:bg-[var(--surface-2)]/80 transition-colors"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-mono uppercase text-[var(--accent-blue)] truncate">
          [{run.siteName || COPY.board.unknownSite}]
        </div>
        {prNumber && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#39FF14]/15 text-[#39FF14] font-medium flex-shrink-0">
            #{prNumber}
          </span>
        )}
      </div>
      <h3 className="font-mono font-medium text-[var(--text-primary)] text-sm line-clamp-2 mb-2">
        {run.title || COPY.board.untitledRun}
      </h3>

      {run.branch && (
        <div className="flex items-center gap-1 text-xs font-mono text-[var(--text-secondary)] mb-2">
          <svg
            className="w-3 h-3 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <span className="truncate">{run.branch}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-[var(--text-tertiary)]">
          {formatDate(run.createdAt)}
        </span>
        <div className="flex items-center gap-1.5">
          {run.pullRequestUrl && run.prCheckStatus && (
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                run.prCheckStatus === "success"
                  ? "bg-green-400"
                  : run.prCheckStatus === "failure"
                  ? "bg-red-400"
                  : "bg-yellow-400 animate-pulse"
              }`}
              title={
                run.prCheckStatus === "success"
                  ? COPY.card.checksPass
                  : run.prCheckStatus === "failure"
                  ? COPY.card.checksFail
                  : COPY.card.checksRunning
              }
            />
          )}
          {run.pullRequestUrl && run.prNeedsUpdate && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[var(--accent-amber)]/20 text-[var(--accent-amber)] font-medium">
              {COPY.card.prOutdated}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
