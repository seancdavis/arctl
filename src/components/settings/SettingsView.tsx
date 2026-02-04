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
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Sync Settings
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Enable sites to sync their agent runs. Only enabled sites will be
        checked for new runs during sync.
      </p>

      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
        <div className="px-4 py-3 bg-gray-50 rounded-t-lg">
          <span className="text-sm font-medium text-gray-700">
            {enabledCount} of {sites.length} sites enabled
          </span>
        </div>

        {sortedSites.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            No sites found. Sites will appear here after loading.
          </div>
        ) : (
          sortedSites.map((site) => (
            <div
              key={site.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <div>
                <p className="font-medium text-gray-900">{site.name}</p>
                <p className="text-xs text-gray-500 font-mono">{site.id}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={site.syncEnabled}
                  onChange={(e) => toggleSiteSync(site.id, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
