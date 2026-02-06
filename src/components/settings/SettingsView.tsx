import { useMemo } from "react";
import { useSites } from "../../hooks/useSites";

export function SettingsView() {
  const { sites, toggleSiteSync } = useSites();

  // Sort sites alphabetically by name
  const sortedSites = useMemo(() => {
    return [...sites].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  }, [sites]);

  const enabledCount = sites.filter((s) => s.syncEnabled).length;

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
        Sync Settings
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Enable sites to sync their agent runs. Only enabled sites will be
        checked for new runs during sync.
      </p>

      <div className="bg-[var(--surface-2)] rounded-lg border border-[var(--border)] divide-y divide-[var(--border-subtle)]">
        <div className="px-4 py-3 bg-[var(--surface-3)] rounded-t-lg">
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {enabledCount} of {sites.length} sites enabled
          </span>
        </div>

        {sortedSites.length === 0 ? (
          <div className="px-4 py-8 text-center text-[var(--text-secondary)]">
            No sites found. Sites will appear here after loading.
          </div>
        ) : (
          sortedSites.map((site) => (
            <div
              key={site.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-3)]/50"
            >
              <div>
                <p className="font-medium text-[var(--text-primary)]">{site.name}</p>
                <p className="text-xs text-[var(--text-tertiary)] font-mono">{site.id}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={site.syncEnabled}
                  onChange={(e) => toggleSiteSync(site.id, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--surface-4)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-900/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-transparent after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--text-tertiary)] after:border-[var(--border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-blue)] peer-checked:after:bg-white"></div>
              </label>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
