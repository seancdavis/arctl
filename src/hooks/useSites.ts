import { useEffect, useCallback } from "react";
import { useKanbanStore } from "../store/kanbanStore";
import { fetchSites, toggleSiteSync as apiToggleSiteSync } from "../api/sitesApi";

export function useSites() {
  const { sites, setSites, setError } = useKanbanStore();

  const loadSites = useCallback(async () => {
    try {
      const fetchedSites = await fetchSites();
      setSites(fetchedSites);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sites");
    }
  }, [setSites, setError]);

  const toggleSiteSync = useCallback(
    async (siteId: string, syncEnabled: boolean) => {
      const updated = await apiToggleSiteSync(siteId, syncEnabled);
      setSites(sites.map((s) => (s.id === siteId ? updated : s)));
      return updated;
    },
    [sites, setSites]
  );

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  return {
    sites,
    loadSites,
    toggleSiteSync,
  };
}
