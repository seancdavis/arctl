import type { Site } from "../types/runs";

const API_BASE = "/api";

export async function fetchSites(): Promise<Site[]> {
  const res = await fetch(`${API_BASE}/sites`);
  if (!res.ok) {
    throw new Error(`Failed to fetch sites: ${res.statusText}`);
  }
  return res.json();
}

export async function toggleSiteSync(
  siteId: string,
  syncEnabled: boolean
): Promise<Site> {
  const res = await fetch(`${API_BASE}/sites/${siteId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ syncEnabled }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update site: ${res.statusText}`);
  }
  return res.json();
}
