import { useMemo } from "react";
import type { Site } from "../../types/runs";
import { COPY } from "../../copy";

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
  const sortedSites = useMemo(() => {
    return [...sites]
      .filter((site) => site.syncEnabled)
      .sort((a, b) => {
        if (a.id === lastUsedSiteId) return -1;
        if (b.id === lastUsedSiteId) return 1;
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
  }, [sites, lastUsedSiteId]);

  return (
    <div>
      <label
        htmlFor="site"
        className="block text-sm font-mono font-medium text-[var(--text-secondary)] mb-1"
      >
        {COPY.detail.site}
      </label>
      <select
        id="site"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[var(--surface-3)] border border-[var(--border)] px-3 py-2 font-mono text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
      >
        <option value="">{COPY.apiKeys.sitePlaceholder}</option>
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
