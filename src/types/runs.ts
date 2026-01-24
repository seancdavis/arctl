export type RunState = "NEW" | "RUNNING" | "DONE" | "ERROR" | "ARCHIVED";

export type KanbanColumn = "new" | "running" | "review" | "pr_open" | "error";

// Matches Drizzle schema (camelCase)
export interface Run {
  id: string;
  siteId: string;
  siteName: string | null;
  title: string | null;
  state: RunState;
  branch: string | null;
  pullRequestUrl: string | null;
  deployPreviewUrl: string | null;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
  archivedAt: string | null;
  customNotes: string | null;
}

export interface Session {
  id: string;
  runId: string;
  state: string;
  prompt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Site {
  id: string;
  name: string;
  updatedAt: string;
}

export interface SyncState {
  id: number;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  backoffSeconds: number;
  consecutiveNoChange: number;
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
  if (run.archivedAt) return null;

  switch (run.state) {
    case "NEW":
      return "new";
    case "RUNNING":
      return "running";
    case "DONE":
      return run.pullRequestUrl ? "pr_open" : "review";
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
