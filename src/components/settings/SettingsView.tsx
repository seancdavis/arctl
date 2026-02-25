import { useMemo, useState } from "react";
import { useSites } from "../../hooks/useSites";
import { AddSiteModal } from "./AddSiteModal";
import { COPY } from "../../copy";

export function SettingsView() {
  const { sites, addSite, removeSite } = useSites();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const sortedSites = useMemo(() => {
    return [...sites].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  }, [sites]);

  const handleRemove = async (siteId: string) => {
    setRemovingId(siteId);
    try {
      await removeSite(siteId);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-mono font-semibold text-[var(--text-primary)]">
          {COPY.settings.heading}
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-neon px-4 py-2"
        >
          {COPY.settings.addSite}
        </button>
      </div>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        {COPY.settings.description}
      </p>

      <div className="bg-[var(--surface-2)] border border-[var(--border)] divide-y divide-[var(--border-subtle)]">
        <div className="px-4 py-3 bg-[var(--surface-3)]">
          <span className="text-sm font-mono font-medium text-[var(--text-secondary)]">
            {COPY.settings.siteCount(sites.length)}
          </span>
        </div>

        {sortedSites.length === 0 ? (
          <div className="px-4 py-8 text-center font-mono text-[var(--text-secondary)]">
            {COPY.settings.noSites}
          </div>
        ) : (
          sortedSites.map((site) => (
            <div
              key={site.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-3)]/50"
            >
              <div>
                <p className="font-mono font-medium text-[var(--text-primary)]">
                  {site.name}
                </p>
                <p className="text-xs text-[var(--text-tertiary)] font-mono">
                  {site.id}
                </p>
              </div>
              <button
                onClick={() => handleRemove(site.id)}
                disabled={removingId === site.id}
                className="text-sm font-mono text-[var(--accent-red)] hover:text-[var(--accent-red)]/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {COPY.settings.removeSite}
              </button>
            </div>
          ))
        )}
      </div>

      <AddSiteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddSite={addSite}
        existingSites={sites}
      />
    </div>
  );
}
