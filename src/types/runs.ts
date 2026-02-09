export type RunState = "NEW" | "RUNNING" | "DONE" | "ERROR" | "ARCHIVED";

export type KanbanColumn = "new" | "running" | "done" | "pr_open" | "pr_merged" | "error";

// Matches Drizzle schema (camelCase)
export interface Run {
  id: string;
  siteId: string;
  siteName: string | null;
  title: string | null;
  state: RunState;
  branch: string | null;
  pullRequestUrl: string | null;
  pullRequestState: string | null;
  pullRequestBranch: string | null;
  deployPreviewUrl: string | null;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
  archivedAt: string | null;
  prCommittedAt: string | null;
  prNeedsUpdate: boolean;
  prCheckStatus: string | null;
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
  syncEnabled: boolean;
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
  agent?: string;
}

export interface AddSessionRequest {
  prompt: string;
}

export interface UpdateRunRequest {
  custom_notes?: string;
  archived?: boolean;
}

export interface PrCheckRun {
  name: string;
  status: string;
  conclusion: string | null;
  detailsUrl: string | null;
}

export interface PrStatus {
  mergeable: boolean | null;
  mergeableState: string;
  reviewDecision: string | null;
  overallCheckStatus: string | null;
  checks: PrCheckRun[];
  checksUrl: string;
  deployPreviewUrl: string | null;
}

export function getKanbanColumn(run: Run): KanbanColumn | null {
  if (run.archivedAt) return null;

  switch (run.state) {
    case "NEW":
      return "new";
    case "RUNNING":
      return "running";
    case "DONE":
      if (!run.pullRequestUrl) return "done";
      if (run.pullRequestState === "merged") return "pr_merged";
      if (run.prNeedsUpdate) return "done";
      return "pr_open";
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
  new: { title: "New", color: "bg-blue-900/40 border-blue-500/50" },
  running: { title: "Running", color: "bg-yellow-900/40 border-yellow-500/50" },
  done: { title: "Done", color: "bg-teal-900/40 border-teal-500/50" },
  pr_open: { title: "PR Open", color: "bg-green-900/40 border-green-500/50" },
  pr_merged: { title: "PR Merged", color: "bg-purple-900/40 border-purple-500/50" },
  error: { title: "Error", color: "bg-red-900/40 border-red-500/50" },
};

export const COLUMN_ORDER: KanbanColumn[] = [
  "new",
  "running",
  "done",
  "pr_open",
  "pr_merged",
  "error",
];
