export type RunState = "NEW" | "RUNNING" | "DONE" | "ERROR" | "ARCHIVED";

export type KanbanColumn = "new" | "running" | "review" | "pr_open" | "error";

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

export interface CreateRunRequest {
  site_id: string;
  branch?: string;
  prompt: string;
}

export interface AddSessionRequest {
  prompt: string;
}

export interface UpdateRunRequest {
  custom_notes?: string;
  archived?: boolean;
}

export function getKanbanColumn(run: Run): KanbanColumn | null {
  if (run.archived_at) return null;

  switch (run.state) {
    case "NEW":
      return "new";
    case "RUNNING":
      return "running";
    case "DONE":
      return run.pull_request_url ? "pr_open" : "review";
    case "ERROR":
      return "error";
    case "ARCHIVED":
      return null;
    default:
      return null;
  }
}

export const COLUMN_CONFIG: Record<
  KanbanColumn,
  { title: string; color: string }
> = {
  new: { title: "New", color: "bg-blue-100 border-blue-300" },
  running: { title: "Running", color: "bg-yellow-100 border-yellow-300" },
  review: { title: "Review", color: "bg-purple-100 border-purple-300" },
  pr_open: { title: "PR Open", color: "bg-green-100 border-green-300" },
  error: { title: "Error", color: "bg-red-100 border-red-300" },
};

export const COLUMN_ORDER: KanbanColumn[] = [
  "new",
  "running",
  "review",
  "pr_open",
  "error",
];
