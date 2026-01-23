import { useEffect, useCallback } from "react";
import { useKanbanStore } from "../store/kanbanStore";
import { fetchSites } from "../api/sitesApi";

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

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  return {
    sites,
    loadSites,
  };
}
