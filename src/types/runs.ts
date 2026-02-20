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
  mergedAt: string | null;
}

export interface Session {
  id: string;
  runId: string;
  state: string;
  prompt: string | null;
  createdAt: string;
  updatedAt: string;
  title: string | null;
  result: string | null;
  duration: number | null;
  doneAt: string | null;
  mode: string | null;
  hasResultDiff: boolean;
}

export interface Note {
  id: string;
  runId: string;
  content: string;
  createdAt: string;
}

export interface AddNoteRequest {
  content: string;
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
  { color: string }
> = {
  new: { color: "bg-[var(--surface-3)]/60 border-[var(--surface-4)]" },
  running: { color: "bg-[#FFB300]/10 border-[#FFB300]/40" },
  done: { color: "bg-[#00C7B7]/10 border-[#00C7B7]/40" },
  pr_open: { color: "bg-[#39FF14]/10 border-[#39FF14]/40" },
  pr_merged: { color: "bg-[#a855f7]/10 border-[#a855f7]/40" },
  error: { color: "bg-[#ff3b5c]/10 border-[#ff3b5c]/40" },
};

export const COLUMN_ORDER: KanbanColumn[] = [
  "new",
  "running",
  "done",
  "pr_open",
  "pr_merged",
  "error",
];
