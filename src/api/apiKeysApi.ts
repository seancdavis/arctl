import { fetchWithAuth } from "./fetchWithAuth";

const API_BASE = "/api";

export interface ApiKeyInfo {
  id: string;
  keyPrefix: string;
  name: string;
  siteId: string;
  siteName: string | null;
  scopes: string[];
  isRevoked: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
  siteId: string;
  siteName: string;
  scopes: string[];
  expiresAt?: string;
}

export async function fetchApiKeys(siteId?: string): Promise<ApiKeyInfo[]> {
  const url = siteId
    ? `${API_BASE}/keys?siteId=${siteId}`
    : `${API_BASE}/keys`;
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch API keys: ${res.statusText}`);
  }
  return res.json();
}

export async function createApiKey(
  data: CreateApiKeyRequest
): Promise<{ rawKey: string }> {
  const res = await fetchWithAuth(`${API_BASE}/keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `Failed to create API key: ${res.statusText}`);
  }
  return res.json();
}

export async function revokeApiKey(id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/keys/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `Failed to revoke API key: ${res.statusText}`);
  }
}
