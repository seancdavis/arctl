import type { Site, Account, AccountSite } from "../types/runs";
import { fetchWithAuth } from "./fetchWithAuth";

const API_BASE = "/api";

export async function fetchSites(): Promise<Site[]> {
  const res = await fetchWithAuth(`${API_BASE}/sites`);
  if (!res.ok) {
    throw new Error(`Failed to fetch sites: ${res.statusText}`);
  }
  return res.json();
}

export async function addSite(id: string, name: string): Promise<Site> {
  const res = await fetchWithAuth(`${API_BASE}/sites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, name }),
  });
  if (!res.ok) {
    throw new Error(`Failed to add site: ${res.statusText}`);
  }
  return res.json();
}

export async function removeSite(siteId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/sites/${siteId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Failed to remove site: ${res.statusText}`);
  }
}

export async function fetchAccounts(): Promise<Account[]> {
  const res = await fetchWithAuth(`${API_BASE}/accounts`);
  if (!res.ok) {
    throw new Error(`Failed to fetch accounts: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchAccountSites(slug: string): Promise<AccountSite[]> {
  const res = await fetchWithAuth(`${API_BASE}/accounts/${slug}/sites`);
  if (!res.ok) {
    throw new Error(`Failed to fetch account sites: ${res.statusText}`);
  }
  return res.json();
}
