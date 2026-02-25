import { useEffect, useCallback } from "react";
import { useKanbanStore } from "../store/kanbanStore";
import {
  fetchSites,
  addSite as apiAddSite,
  removeSite as apiRemoveSite,
} from "../api/sitesApi";

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

  const addSite = useCallback(
    async (id: string, name: string) => {
      const added = await apiAddSite(id, name);
      setSites([...sites, added]);
      return added;
    },
    [sites, setSites]
  );

  const removeSite = useCallback(
    async (siteId: string) => {
      await apiRemoveSite(siteId);
      setSites(sites.filter((s) => s.id !== siteId));
    },
    [sites, setSites]
  );

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  return {
    sites,
    loadSites,
    addSite,
    removeSite,
  };
}
