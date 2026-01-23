import type { Site } from "../types/runs";

const API_BASE = "/api";

export async function fetchSites(): Promise<Site[]> {
  const res = await fetch(`${API_BASE}/sites`);
  if (!res.ok) {
    throw new Error(`Failed to fetch sites: ${res.statusText}`);
  }
  return res.json();
}
