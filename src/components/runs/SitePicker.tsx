import { useMemo } from "react";
import type { Site } from "../../types/runs";

interface SitePickerProps {
  sites: Site[];
  value: string;
  onChange: (siteId: string) => void;
  lastUsedSiteId: string | null;
}

export function SitePicker({
  sites,
  value,
  onChange,
  lastUsedSiteId,
}: SitePickerProps) {
  // Sort sites: last used first, then by most recently updated
  const sortedSites = useMemo(() => {
    return [...sites].sort((a, b) => {
      if (a.id === lastUsedSiteId) return -1;
      if (b.id === lastUsedSiteId) return 1;
      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });
  }, [sites, lastUsedSiteId]);

  return (
    <div>
      <label
        htmlFor="site"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Site
      </label>
      <select
        id="site"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">Select a site...</option>
        {sortedSites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.name}
            {site.id === lastUsedSiteId ? " (Recent)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
