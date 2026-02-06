import { useSyncStatus } from "../../hooks/useSyncStatus";

export function SyncStatus() {
  const { isSyncing, refresh, formatLastSync, formatNextSync } = useSyncStatus();

  const nextSync = formatNextSync();

  return (
    <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
      <div className="flex items-center gap-1.5">
        <span className="text-[var(--text-tertiary)]">Last sync:</span>
        <span>{formatLastSync()}</span>
      </div>

      {nextSync && (
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--text-tertiary)]">Next:</span>
          <span>{nextSync}</span>
        </div>
      )}

      <button
        onClick={() => refresh(true)}
        disabled={isSyncing}
        className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] rounded transition-colors disabled:opacity-50"
        title="Refresh now (resets backoff)"
      >
        <svg
          className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  );
}
