import { useMemo } from "react";
import { useKanbanStore } from "../../store/kanbanStore";
import { COPY } from "../../copy";

export function SiteFilter() {
  const runs = useKanbanStore((s) => s.runs);
  const filterSiteId = useKanbanStore((s) => s.filterSiteId);
  const setFilterSiteId = useKanbanStore((s) => s.setFilterSiteId);

  const sitesInUse = useMemo(() => {
    const map = new Map<string, string>();
    for (const run of runs) {
      if (!map.has(run.siteId)) {
        map.set(run.siteId, run.siteName || COPY.board.unknownSite);
      }
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ id, name }));
  }, [runs]);

  if (sitesInUse.length <= 1) return null;

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={filterSiteId || ""}
        onChange={(e) => setFilterSiteId(e.target.value || null)}
        aria-label={COPY.board.filterLabel}
        className="bg-[var(--surface-3)] border border-[var(--border)] px-2 py-1.5 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
      >
        <option value="">{COPY.board.allSites}</option>
        {sitesInUse.map((site) => (
          <option key={site.id} value={site.id}>
            {site.name}
          </option>
        ))}
      </select>
      {filterSiteId && (
        <button
          onClick={() => setFilterSiteId(null)}
          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-colors"
          aria-label={COPY.board.clearFilter}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
