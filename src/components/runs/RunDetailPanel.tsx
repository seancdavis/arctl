import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useKanbanStore } from "../../store/kanbanStore";
import { fetchRun, type RunWithSessions } from "../../api/runsApi";
import type { Run, Session } from "../../types/runs";
import { AddSessionForm } from "./AddSessionForm";

interface RunDetailPanelProps {
  onArchive: (id: string) => void;
  onCreatePR: (id: string) => void;
  onAddSession: (runId: string, prompt: string) => Promise<void>;
}

const STATE_BADGES: Record<string, { label: string; className: string }> = {
  NEW: { label: "New", className: "bg-blue-500/20 text-blue-300" },
  RUNNING: { label: "Running", className: "bg-yellow-500/20 text-yellow-300" },
  DONE: { label: "Done", className: "bg-teal-500/20 text-teal-300" },
  ERROR: { label: "Error", className: "bg-red-500/20 text-red-300" },
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PROMPT_COLLAPSE_LENGTH = 200;

function SessionCard({ session }: { session: Session }) {
  const [expanded, setExpanded] = useState(false);
  const prompt = session.prompt || "";
  const isLong = prompt.length > PROMPT_COLLAPSE_LENGTH;

  return (
    <div className="bg-[var(--surface-3)] rounded-lg px-3 py-2.5 text-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[var(--text-tertiary)] text-xs">
          {formatDate(session.createdAt)}
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${
          session.state === "completed" || session.state === "done"
            ? "bg-teal-500/20 text-teal-300"
            : session.state === "running"
            ? "bg-yellow-500/20 text-yellow-300"
            : session.state === "error"
            ? "bg-red-500/20 text-red-300"
            : "bg-blue-500/20 text-blue-300"
        }`}>
          {session.state}
        </span>
      </div>
      {prompt && (
        <div>
          <p className={`text-[var(--text-secondary)] whitespace-pre-wrap break-words ${!expanded && isLong ? "line-clamp-3" : ""}`}>
            {prompt}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-[var(--accent-blue)] hover:brightness-125 mt-1"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function RunDetailPanel({
  onArchive,
  onCreatePR,
  onAddSession,
}: RunDetailPanelProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const runs = useKanbanStore((s) => s.runs);

  const [run, setRun] = useState<Run | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Find run instantly from store, or null if not loaded yet
  useEffect(() => {
    const storeRun = runs.find((r) => r.id === id);
    if (storeRun) setRun(storeRun);
  }, [id, runs]);

  // Fetch full run with sessions from API
  useEffect(() => {
    if (!id) return;
    setIsLoadingSessions(true);
    fetchRun(id)
      .then((data: RunWithSessions) => {
        setRun(data);
        setSessions(data.sessions || []);
      })
      .catch(() => {
        // Run might not exist — navigate back
        navigate("/", { replace: true });
      })
      .finally(() => setIsLoadingSessions(false));
  }, [id, navigate]);

  // Slide-in animation
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const close = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => navigate("/"), 200);
  }, [navigate]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [close]);

  const handleArchive = () => {
    if (!id) return;
    onArchive(id);
    close();
  };

  const handleCreatePR = () => {
    if (!id) return;
    onCreatePR(id);
  };

  const handleAddSession = async (runId: string, prompt: string) => {
    await onAddSession(runId, prompt);
    // Refetch to get updated sessions
    if (id) {
      const data = await fetchRun(id);
      setRun(data);
      setSessions(data.sessions || []);
    }
    setShowSessionForm(false);
  };

  const badge = run ? STATE_BADGES[run.state] : null;

  const netlifyUrl = run?.siteName && run?.id
    ? `https://app.netlify.com/sites/${run.siteName}/agents/${run.id}`
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-200 ${isVisible ? "opacity-100" : "opacity-0"}`}
        onClick={close}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:max-w-2xl bg-[var(--surface-2)] z-50 border-l border-[var(--border)] shadow-2xl flex flex-col transition-transform duration-200 ${isVisible ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border)]">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] line-clamp-2">
              {run?.title || "Loading..."}
            </h2>
            {netlifyUrl && (
              <a
                href={netlifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--accent-blue)] hover:brightness-125 mt-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View on Netlify
              </a>
            )}
          </div>
          <button
            onClick={close}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] flex-shrink-0 mt-0.5"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {run && (
            <div className="px-5 py-4 space-y-5">
              {/* Metadata */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                  <span className="text-[var(--text-tertiary)]">Site</span>
                  <span className="text-[var(--text-primary)]">{run.siteName || "Unknown"}</span>

                  {run.branch && (
                    <>
                      <span className="text-[var(--text-tertiary)]">Branch</span>
                      <span className="text-[var(--text-primary)] font-mono text-xs">{run.branch}</span>
                    </>
                  )}

                  <span className="text-[var(--text-tertiary)]">Created</span>
                  <span className="text-[var(--text-secondary)]">{formatDate(run.createdAt)}</span>

                  <span className="text-[var(--text-tertiary)]">Updated</span>
                  <span className="text-[var(--text-secondary)]">{formatDate(run.updatedAt)}</span>
                </div>
              </div>

              {/* Links */}
              {(run.pullRequestUrl || run.deployPreviewUrl) && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                    Links
                  </h3>
                  <div className="space-y-1.5">
                    {run.pullRequestUrl && (
                      <a
                        href={run.pullRequestUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[var(--accent-blue)] hover:brightness-125"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z" />
                        </svg>
                        View Pull Request
                      </a>
                    )}
                    {run.deployPreviewUrl && (
                      <a
                        href={run.deployPreviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[var(--accent-green)] hover:brightness-125"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        Deploy Preview
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Sessions */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Sessions ({sessions.length})
                </h3>
                {isLoadingSessions ? (
                  <div className="text-sm text-[var(--text-tertiary)] py-2">Loading sessions...</div>
                ) : sessions.length === 0 ? (
                  <div className="text-sm text-[var(--text-tertiary)] py-2">No sessions</div>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                  </div>
                )}
              </div>

              {/* Follow-up form */}
              {(run.state === "DONE" || run.state === "ERROR") && (
                <div className="space-y-2">
                  {showSessionForm ? (
                    <AddSessionForm
                      runId={run.id}
                      onAddSession={handleAddSession}
                      onCancel={() => setShowSessionForm(false)}
                    />
                  ) : (
                    <button
                      onClick={() => setShowSessionForm(true)}
                      className="text-sm text-[var(--accent-blue)] hover:brightness-125"
                    >
                      + Add Follow-up Session
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {run && (
          <div className="px-5 py-4 border-t border-[var(--border)] flex gap-3">
            {run.state === "DONE" && !run.pullRequestUrl && (
              <button
                onClick={handleCreatePR}
                className="btn-neon px-4 py-2 text-sm rounded-lg"
              >
                Create PR
              </button>
            )}
            <button
              onClick={handleArchive}
              className="px-4 py-2 text-sm rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-colors ml-auto"
            >
              Archive
            </button>
          </div>
        )}
      </div>
    </>
  );
}
