import type { SyncState } from "../types/runs";

const API_BASE = "/api";

export interface SyncTriggerResponse {
  message: string;
  sync_state: SyncState;
}

export async function triggerSync(reset = false): Promise<SyncTriggerResponse> {
  const url = reset
    ? `${API_BASE}/sync/trigger?reset=true`
    : `${API_BASE}/sync/trigger`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Failed to trigger sync: ${res.statusText}`);
  }
  return res.json();
}
