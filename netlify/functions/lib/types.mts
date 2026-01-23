export type RunState = "NEW" | "RUNNING" | "DONE" | "ERROR" | "ARCHIVED";

export interface Run {
  id: string;
  site_id: string;
  site_name: string | null;
  title: string | null;
  state: RunState;
  branch: string | null;
  pull_request_url: string | null;
  deploy_preview_url: string | null;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
  archived_at: string | null;
  custom_notes: string | null;
}

export interface Session {
  id: string;
  run_id: string;
  state: string;
  prompt: string | null;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  name: string;
  updated_at: string;
}

export interface SyncState {
  id: number;
  last_sync_at: string | null;
  next_sync_at: string | null;
  backoff_seconds: number;
  consecutive_no_change: number;
}

export interface NetlifyAgentRun {
  id: string;
  site_id: string;
  state: string;
  title?: string;
  branch?: string;
  pull_request_url?: string;
  deploy_preview_url?: string;
  created_at: string;
  updated_at: string;
}

export interface NetlifyAgentSession {
  id: string;
  state: string;
  prompt?: string;
  created_at: string;
  updated_at: string;
}

export interface NetlifySite {
  id: string;
  name: string;
  updated_at: string;
}
