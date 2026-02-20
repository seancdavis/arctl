import type {
  Run,
  Session,
  Note,
  CreateRunRequest,
  AddSessionRequest,
  AddNoteRequest,
  UpdateRunRequest,
  PrStatus,
} from "../types/runs";
import { fetchWithAuth } from "./fetchWithAuth";

const API_BASE = "/api";

export interface RunWithSessions extends Run {
  sessions: Session[];
  notes: Note[];
}

export async function fetchRuns(archived = false): Promise<Run[]> {
  const url = archived ? `${API_BASE}/runs?archived=true` : `${API_BASE}/runs`;
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch runs: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchRun(id: string): Promise<RunWithSessions> {
  const res = await fetchWithAuth(`${API_BASE}/runs/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch run: ${res.statusText}`);
  }
  return res.json();
}

export async function syncRun(id: string): Promise<RunWithSessions> {
  const res = await fetchWithAuth(`${API_BASE}/runs/${id}?sync=true`);
  if (!res.ok) {
    throw new Error(`Failed to sync run: ${res.statusText}`);
  }
  return res.json();
}

export async function createRun(data: CreateRunRequest): Promise<Run> {
  const res = await fetchWithAuth(`${API_BASE}/runs`, {
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
  const res = await fetchWithAuth(`${API_BASE}/runs/${id}`, {
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
  const res = await fetchWithAuth(`${API_BASE}/runs/${runId}/sessions`, {
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
  const res = await fetchWithAuth(`${API_BASE}/runs/${runId}/pull-request`, {
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

export async function fetchPrStatus(runId: string): Promise<PrStatus> {
  const res = await fetchWithAuth(`${API_BASE}/runs/${runId}/pr-status`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      error.error || `Failed to fetch PR status: ${res.statusText}`
    );
  }
  return res.json();
}

export async function addNote(
  runId: string,
  data: AddNoteRequest
): Promise<Note> {
  const res = await fetchWithAuth(`${API_BASE}/runs/${runId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `Failed to add note: ${res.statusText}`);
  }
  return res.json();
}

export async function mergePullRequest(runId: string): Promise<Run> {
  const res = await fetchWithAuth(`${API_BASE}/runs/${runId}/pr-merge`, {
    method: "POST",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      error.error || `Failed to merge PR: ${res.statusText}`
    );
  }
  return res.json();
}

export async function fetchSessionDiff(
  runId: string,
  sessionId: string,
  type: "result" | "cumulative" = "result"
): Promise<{ diff: string | null; type: string }> {
  const res = await fetchWithAuth(
    `${API_BASE}/runs/${runId}/sessions/${sessionId}/diff?type=${type}`
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `Failed to fetch diff: ${res.statusText}`);
  }
  return res.json();
}

export async function updatePullRequest(runId: string): Promise<Run> {
  const res = await fetchWithAuth(`${API_BASE}/runs/${runId}/pull-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update" }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      error.error || `Failed to update PR: ${res.statusText}`
    );
  }
  return res.json();
}
