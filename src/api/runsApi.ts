import type {
  Run,
  Session,
  CreateRunRequest,
  AddSessionRequest,
  UpdateRunRequest,
} from "../types/runs";

const API_BASE = "/api";

export interface RunWithSessions extends Run {
  sessions: Session[];
}

export async function fetchRuns(archived = false): Promise<Run[]> {
  const url = archived ? `${API_BASE}/runs?archived=true` : `${API_BASE}/runs`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch runs: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchRun(id: string): Promise<RunWithSessions> {
  const res = await fetch(`${API_BASE}/runs/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch run: ${res.statusText}`);
  }
  return res.json();
}

export async function createRun(data: CreateRunRequest): Promise<Run> {
  const res = await fetch(`${API_BASE}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `Failed to create run: ${res.statusText}`);
  }
  return res.json();
}

export async function updateRun(
  id: string,
  data: UpdateRunRequest
): Promise<Run> {
  const res = await fetch(`${API_BASE}/runs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to update run: ${res.statusText}`);
  }
  return res.json();
}

export async function archiveRun(id: string): Promise<Run> {
  return updateRun(id, { archived: true });
}

export async function unarchiveRun(id: string): Promise<Run> {
  return updateRun(id, { archived: false });
}

export async function addSession(
  runId: string,
  data: AddSessionRequest
): Promise<Session> {
  const res = await fetch(`${API_BASE}/runs/${runId}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      error.error || `Failed to add session: ${res.statusText}`
    );
  }
  return res.json();
}

export async function createPullRequest(runId: string): Promise<Run> {
  const res = await fetch(`${API_BASE}/runs/${runId}/pull-request`, {
    method: "POST",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      error.error || `Failed to create PR: ${res.statusText}`
    );
  }
  return res.json();
}
