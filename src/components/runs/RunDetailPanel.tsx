import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useKanbanStore } from "../../store/kanbanStore";
import { fetchRun, syncRun, fetchPrStatus, type RunWithSessions } from "../../api/runsApi";
import type { Run, Session, Note, PrStatus, PrCheckRun } from "../../types/runs";
import { AddSessionForm } from "./AddSessionForm";
import { AddNoteForm } from "./AddNoteForm";
import { NoteCard } from "./NoteCard";
import { COPY } from "../../copy";

interface RunDetailPanelProps {
  onArchive: (id: string) => void;
  onCreatePR: (id: string) => void;
  onUpdatePR: (id: string) => void;
  onAddSession: (runId: string, prompt: string) => Promise<void>;
}

const STATE_BADGES: Record<string, { className: string }> = {
  NEW: { className: "bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]" },
  RUNNING: { className: "bg-[var(--accent-amber)]/20 text-[var(--accent-amber)]" },
  DONE: { className: "bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]" },
  ERROR: { className: "bg-[var(--accent-red)]/20 text-[var(--accent-red)]" },
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

function SessionCard({ session, prCommittedAt }: { session: Session; prCommittedAt: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const prompt = session.prompt || "";
  const isLong = prompt.length > PROMPT_COLLAPSE_LENGTH;

  const isUncommitted = prCommittedAt && new Date(session.createdAt) > new Date(prCommittedAt);

  return (
    <div className={`bg-[var(--surface-3)] px-3 py-2.5 text-sm ${isUncommitted ? "border border-[var(--accent-amber)]/30" : ""}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-tertiary)] text-xs font-mono">
            {formatDate(session.createdAt)}
          </span>
          {isUncommitted && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[var(--accent-amber)]/20 text-[var(--accent-amber)] font-medium">
              {COPY.detail.notInPr}
            </span>
          )}
        </div>
        <span className={`text-xs font-mono px-1.5 py-0.5 ${
          session.state === "completed" || session.state === "done"
            ? "bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]"
            : session.state === "running"
            ? "bg-[var(--accent-amber)]/20 text-[var(--accent-amber)]"
            : session.state === "error"
            ? "bg-[var(--accent-red)]/20 text-[var(--accent-red)]"
            : "bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]"
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
              className="text-xs font-mono text-[var(--accent-blue)] hover:brightness-125 mt-1"
            >
              {expanded ? COPY.detail.showLess : COPY.detail.showMore}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CheckIcon({ conclusion, status }: { conclusion: string | null; status: string }) {
  if (status !== "completed") {
    return (
      <svg className="w-4 h-4 text-[var(--accent-amber)] animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    );
  }
  if (conclusion === "success" || conclusion === "neutral" || conclusion === "skipped") {
    return (
      <svg className="w-4 h-4 text-[var(--accent-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-[var(--accent-red)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PrStatusSection({ runId, hasPr }: { runId: string; hasPr: boolean }) {
  const updateStoreRun = useKanbanStore((s) => s.updateRun);
  const [prStatus, setPrStatus] = useState<PrStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checksExpanded, setChecksExpanded] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!hasPr) return;

    let cancelled = false;

    const load = async () => {
      try {
        const status = await fetchPrStatus(runId);
        if (!cancelled) {
          setPrStatus(status);
          setError(null);
          const currentRuns = useKanbanStore.getState().runs;
          const current = currentRuns.find((r) => r.id === runId);
          if (current) {
            updateStoreRun({
              ...current,
              prCheckStatus: status.overallCheckStatus,
              ...(status.deployPreviewUrl ? { deployPreviewUrl: status.deployPreviewUrl } : {}),
            });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load PR status");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    const schedule = () => {
      pollRef.current = setTimeout(async () => {
        await load();
        schedule();
      }, 30_000);
    };
    schedule();

    return () => {
      cancelled = true;
      clearTimeout(pollRef.current);
    };
  }, [runId, hasPr, updateStoreRun]);

  if (!hasPr) return null;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-mono font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
          {COPY.prStatus.heading}
        </h3>
        <div className="text-sm font-mono text-[var(--text-tertiary)] py-2">{COPY.prStatus.loading}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-mono font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
          {COPY.prStatus.heading}
        </h3>
        <div className="text-xs text-[var(--text-tertiary)] py-1">{error}</div>
      </div>
    );
  }

  if (!prStatus) return null;

  const { overallCheckStatus, reviewDecision, mergeable, checks, checksUrl, deployPreviewUrl } = prStatus;

  let bannerText = "";
  let bannerClass = "";
  if (overallCheckStatus === "success" && reviewDecision === "approved" && mergeable) {
    bannerText = COPY.prStatus.readyToMerge;
    bannerClass = "bg-[var(--accent-green)]/15 border-[var(--accent-green)]/30 text-[var(--accent-green)]";
  } else if (overallCheckStatus === "failure") {
    bannerText = COPY.prStatus.checksFailing;
    bannerClass = "bg-[var(--accent-red)]/15 border-[var(--accent-red)]/30 text-[var(--accent-red)]";
  } else if (overallCheckStatus === "pending") {
    bannerText = COPY.prStatus.checksRunning;
    bannerClass = "bg-[var(--accent-amber)]/15 border-[var(--accent-amber)]/30 text-[var(--accent-amber)]";
  } else if (reviewDecision === "changes_requested") {
    bannerText = COPY.prStatus.changesRequested;
    bannerClass = "bg-[var(--accent-red)]/15 border-[var(--accent-red)]/30 text-[var(--accent-red)]";
  } else if (overallCheckStatus === "success") {
    bannerText = COPY.prStatus.checksPassing;
    bannerClass = "bg-[var(--accent-green)]/15 border-[var(--accent-green)]/30 text-[var(--accent-green)]";
  }

  const failingChecks = checks.filter(
    (c: PrCheckRun) => c.conclusion === "failure" || c.conclusion === "timed_out" || c.conclusion === "action_required"
  );
  const passingChecks = checks.filter(
    (c: PrCheckRun) => c.conclusion === "success" || c.conclusion === "neutral" || c.conclusion === "skipped"
  );
  const pendingChecks = checks.filter((c: PrCheckRun) => c.status !== "completed");

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-mono font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
        {COPY.prStatus.heading}
      </h3>

      {bannerText && (
        <div className={`text-sm font-mono font-medium px-3 py-2 border ${bannerClass}`}>
          {bannerText}
        </div>
      )}

      {deployPreviewUrl && (
        <a
          href={deployPreviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-mono px-3 py-2 bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/20 text-[var(--accent-green)] hover:brightness-125 transition-colors"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {COPY.detail.deployPreview}
          <svg className="w-3.5 h-3.5 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}

      <div className="flex flex-wrap gap-2">
        {reviewDecision && (
          <span className={`text-xs font-mono px-2 py-1 ${
            reviewDecision === "approved"
              ? "bg-[var(--accent-green)]/20 text-[var(--accent-green)]"
              : reviewDecision === "changes_requested"
              ? "bg-[var(--accent-red)]/20 text-[var(--accent-red)]"
              : "bg-[var(--accent-amber)]/20 text-[var(--accent-amber)]"
          }`}>
            {reviewDecision === "approved" ? COPY.prStatus.approved : reviewDecision === "changes_requested" ? COPY.prStatus.changesRequested : COPY.prStatus.reviewPending}
          </span>
        )}

        {mergeable !== null && (
          <span className={`text-xs font-mono px-2 py-1 ${
            mergeable
              ? "bg-[var(--accent-green)]/20 text-[var(--accent-green)]"
              : "bg-[var(--accent-red)]/20 text-[var(--accent-red)]"
          }`}>
            {mergeable ? COPY.prStatus.noConflicts : COPY.prStatus.hasConflicts}
          </span>
        )}
      </div>

      {checks.length > 0 && (
        <div>
          <button
            onClick={() => setChecksExpanded(!checksExpanded)}
            className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors w-full"
          >
            <svg className={`w-3 h-3 transition-transform ${checksExpanded ? "rotate-90" : ""}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
            <span>
              {COPY.prStatus.passing(passingChecks.length)}
              {failingChecks.length > 0 && COPY.prStatus.failing(failingChecks.length)}
              {pendingChecks.length > 0 && COPY.prStatus.pending(pendingChecks.length)}
            </span>
            <a
              href={checksUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-[var(--accent-blue)] hover:brightness-125"
              onClick={(e) => e.stopPropagation()}
            >
              {COPY.prStatus.viewAll}
            </a>
          </button>

          {checksExpanded && (
            <div className="mt-2 space-y-1">
              {[...failingChecks, ...pendingChecks, ...passingChecks].map((check: PrCheckRun, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs font-mono py-1 px-2 bg-[var(--surface-3)]">
                  <CheckIcon conclusion={check.conclusion} status={check.status} />
                  <span className="text-[var(--text-secondary)] truncate flex-1">{check.name}</span>
                  {check.detailsUrl && (
                    <a
                      href={check.detailsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent-blue)] hover:brightness-125 flex-shrink-0"
                    >
                      {COPY.prStatus.details}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RunDetailPanel({
  onArchive,
  onCreatePR,
  onUpdatePR,
  onAddSession,
}: RunDetailPanelProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const runs = useKanbanStore((s) => s.runs);
  const updateRun = useKanbanStore((s) => s.updateRun);

  const [run, setRun] = useState<Run | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [runNotes, setRunNotes] = useState<Note[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [prAction, setPrAction] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [prError, setPrError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const storeRun = runs.find((r) => r.id === id);
    if (storeRun) setRun(storeRun);
  }, [id, runs]);

  useEffect(() => {
    if (!id) return;
    setIsLoadingSessions(true);
    fetchRun(id)
      .then((data: RunWithSessions) => {
        setRun(data);
        setSessions(data.sessions || []);
        setRunNotes(data.notes || []);
      })
      .catch(() => {
        navigate("/", { replace: true });
      })
      .finally(() => setIsLoadingSessions(false));
  }, [id, navigate]);

  useEffect(() => {
    if (!id || !run) return;
    const isMerged = run.pullRequestState === "merged";
    if (isMerged) return;

    const poll = async () => {
      try {
        const fresh = await syncRun(id);
        setRun(fresh);
        setSessions(fresh.sessions || []);
        setRunNotes(fresh.notes || []);
        const { sessions: _, ...runData } = fresh as any;
        updateRun(runData);
      } catch {
        // Silently ignore
      }
    };

    const schedule = () => {
      pollTimerRef.current = setTimeout(async () => {
        await poll();
        schedule();
      }, 15_000);
    };

    schedule();
    return () => clearTimeout(pollTimerRef.current);
  }, [id, run?.state, run?.pullRequestState]);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const close = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => navigate("/"), 200);
  }, [navigate]);

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

  const handleCreatePR = async () => {
    if (!id) return;
    setPrAction("loading");
    setPrError(null);
    try {
      await onCreatePR(id);
      setPrAction("success");
      const data = await fetchRun(id);
      setRun(data);
      setSessions(data.sessions || []);
      setRunNotes(data.notes || []);
      setTimeout(() => setPrAction("idle"), 2000);
    } catch (err) {
      setPrError(err instanceof Error ? err.message : COPY.detail.failedCreatePr);
      setPrAction("error");
      setTimeout(() => { setPrAction("idle"); setPrError(null); }, 4000);
    }
  };

  const handleUpdatePR = async () => {
    if (!id) return;
    setPrAction("loading");
    setPrError(null);
    try {
      await onUpdatePR(id);
      setPrAction("success");
      const data = await fetchRun(id);
      setRun(data);
      setSessions(data.sessions || []);
      setRunNotes(data.notes || []);
      setTimeout(() => setPrAction("idle"), 2000);
    } catch (err) {
      setPrError(err instanceof Error ? err.message : COPY.detail.failedUpdatePr);
      setPrAction("error");
      setTimeout(() => { setPrAction("idle"); setPrError(null); }, 4000);
    }
  };

  const handleAddSession = async (runId: string, prompt: string) => {
    await onAddSession(runId, prompt);
    if (id) {
      const data = await fetchRun(id);
      setRun(data);
      setSessions(data.sessions || []);
      setRunNotes(data.notes || []);
    }
    setShowSessionForm(false);
  };

  const stateLabel = run ? (COPY.states[run.state]?.label ?? run.state) : null;
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
            <h2 className="text-lg font-mono font-semibold text-[var(--text-primary)] line-clamp-2">
              {run?.title || COPY.detail.loading}
            </h2>
            {netlifyUrl && (
              <a
                href={netlifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--accent-blue)] hover:brightness-125 mt-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {COPY.detail.viewOnNetlify}
              </a>
            )}
          </div>
          <button
            onClick={close}
            aria-label={COPY.generic.close}
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
                  {badge && stateLabel && (
                    <span className={`text-xs font-mono px-2 py-0.5 font-medium ${badge.className}`}>
                      {stateLabel}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                  <span className="text-[var(--text-tertiary)] font-mono">{COPY.detail.site}</span>
                  <span className="text-[var(--text-primary)]">{run.siteName || COPY.archive.unknownSite}</span>

                  {run.branch && (
                    <>
                      <span className="text-[var(--text-tertiary)] font-mono">{COPY.detail.branch}</span>
                      <span className="text-[var(--text-primary)] font-mono text-xs">{run.branch}</span>
                    </>
                  )}

                  <span className="text-[var(--text-tertiary)] font-mono">{COPY.detail.created}</span>
                  <span className="text-[var(--text-secondary)]">{formatDate(run.createdAt)}</span>

                  <span className="text-[var(--text-tertiary)] font-mono">{COPY.detail.updated}</span>
                  <span className="text-[var(--text-secondary)]">{formatDate(run.updatedAt)}</span>
                </div>
              </div>

              {/* Links */}
              {(run.pullRequestUrl || run.deployPreviewUrl) && (
                <div className="space-y-2">
                  <h3 className="text-xs font-mono font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                    {COPY.detail.links}
                  </h3>
                  <div className="space-y-1.5">
                    {run.pullRequestUrl && (
                      <a
                        href={run.pullRequestUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-mono text-[var(--accent-blue)] hover:brightness-125"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z" />
                        </svg>
                        {COPY.detail.viewPr}
                      </a>
                    )}
                    {run.deployPreviewUrl && (
                      <a
                        href={run.deployPreviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-mono text-[var(--accent-green)] hover:brightness-125"
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
                        {COPY.detail.deployPreview}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* PR Status */}
              <PrStatusSection runId={run.id} hasPr={!!run.pullRequestUrl} />

              {/* Sessions */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  {COPY.detail.sessions(sessions.length)}
                </h3>
                {isLoadingSessions ? (
                  <div className="text-sm font-mono text-[var(--text-tertiary)] py-2">{COPY.detail.loadingSessions}</div>
                ) : sessions.length === 0 ? (
                  <div className="text-sm font-mono text-[var(--text-tertiary)] py-2">{COPY.detail.noSessions}</div>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <SessionCard key={session.id} session={session} prCommittedAt={run.prCommittedAt} />
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
                      className="text-sm font-mono text-[var(--accent-blue)] hover:brightness-125"
                    >
                      {COPY.detail.addSession}
                    </button>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  {COPY.detail.notes(runNotes.length)}
                </h3>
                {runNotes.length > 0 && (
                  <div className="space-y-2">
                    {runNotes.map((note) => (
                      <NoteCard key={note.id} note={note} />
                    ))}
                  </div>
                )}
                {showNoteForm ? (
                  <AddNoteForm
                    runId={run.id}
                    onNoteAdded={async () => {
                      const data = await fetchRun(run.id);
                      setRunNotes(data.notes || []);
                      setShowNoteForm(false);
                    }}
                    onCancel={() => setShowNoteForm(false)}
                  />
                ) : (
                  <button
                    onClick={() => setShowNoteForm(true)}
                    className="text-sm font-mono text-[var(--accent-blue)] hover:brightness-125"
                  >
                    {COPY.detail.addNote}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {run && (
          <div className="px-5 py-4 border-t border-[var(--border)] space-y-2">
            {prAction === "error" && prError && (
              <div className="text-xs font-mono text-[var(--accent-red)] bg-[var(--accent-red)]/10 px-3 py-1.5">
                {prError}
              </div>
            )}
            <div className="flex gap-3">
              {run.state === "DONE" && !run.pullRequestUrl && (
                <button
                  onClick={handleCreatePR}
                  disabled={prAction === "loading"}
                  className="btn-neon px-4 py-2 text-sm disabled:opacity-50"
                >
                  {prAction === "loading" ? COPY.detail.creatingPr : prAction === "success" ? COPY.detail.prCreated : COPY.detail.createPr}
                </button>
              )}
              {run.pullRequestUrl && (run.pullRequestState === "open" || run.pullRequestState === "draft") && (
                <button
                  onClick={handleUpdatePR}
                  disabled={prAction === "loading"}
                  className={`px-4 py-2 text-sm font-mono uppercase tracking-wider transition-colors disabled:opacity-50 ${
                    prAction === "success"
                      ? "border border-[var(--accent-green)]/40 text-[var(--accent-green)] bg-[var(--accent-green)]/10"
                      : run.prNeedsUpdate
                      ? "btn-neon"
                      : "border border-[var(--accent-blue)]/40 text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/10"
                  }`}
                >
                  {prAction === "loading" ? COPY.detail.updatingPr : prAction === "success" ? COPY.detail.prUpdated : COPY.detail.updatePr}
                </button>
              )}
              <button
                onClick={handleArchive}
                className="px-4 py-2 text-sm font-mono text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-colors ml-auto"
              >
                {COPY.detail.archive}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
