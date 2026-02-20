import { useState, useEffect } from "react";
import { useKanbanStore } from "../../store/kanbanStore";
import { useSites } from "../../hooks/useSites";
import { SitePicker } from "./SitePicker";
import { COPY } from "../../copy";

interface CreateRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRun: (data: {
    site_id: string;
    branch?: string;
    prompt: string;
    agent?: string;
  }) => Promise<unknown>;
}

export function CreateRunModal({
  isOpen,
  onClose,
  onCreateRun,
}: CreateRunModalProps) {
  const { sites } = useSites();
  const { lastUsedSiteId, setLastUsedSiteId } = useKanbanStore();

  const [siteId, setSiteId] = useState(lastUsedSiteId || "");
  const [branch, setBranch] = useState("");
  const [prompt, setPrompt] = useState("");
  const [agent, setAgent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && lastUsedSiteId) {
      setSiteId(lastUsedSiteId);
    }
  }, [isOpen, lastUsedSiteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !prompt.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onCreateRun({
        site_id: siteId,
        branch: branch.trim() || undefined,
        prompt: prompt.trim(),
        agent: agent || undefined,
      });
      setLastUsedSiteId(siteId);
      setSiteId("");
      setBranch("");
      setPrompt("");
      setAgent("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : COPY.createRun.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="create-run-title">
      <div className="bg-[var(--surface-2)] shadow-2xl w-full max-w-lg mx-4 border border-[var(--border)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 id="create-run-title" className="text-lg font-mono font-semibold text-[var(--text-primary)]">
            {COPY.createRun.title}
          </h2>
          <button
            onClick={onClose}
            aria-label={COPY.generic.close}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/20 px-4 py-3 text-sm font-mono">
              {error}
            </div>
          )}

          <SitePicker
            sites={sites}
            value={siteId}
            onChange={setSiteId}
            lastUsedSiteId={lastUsedSiteId}
          />

          <div>
            <label
              htmlFor="branch"
              className="block text-sm font-mono font-medium text-[var(--text-secondary)] mb-1"
            >
              {COPY.createRun.branch}
            </label>
            <input
              type="text"
              id="branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder={COPY.createRun.branchPlaceholder}
              className="w-full bg-[var(--surface-3)] border border-[var(--border)] terminal-input px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="agent"
              className="block text-sm font-mono font-medium text-[var(--text-secondary)] mb-1"
            >
              {COPY.createRun.agent}
            </label>
            <select
              id="agent"
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              className="w-full bg-[var(--surface-3)] border border-[var(--border)] px-3 py-2 font-mono text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
            >
              <option value="claude">Claude</option>
              <option value="gemini">Gemini</option>
              <option value="codex">Codex</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="prompt"
              className="block text-sm font-mono font-medium text-[var(--text-secondary)] mb-1"
            >
              {COPY.createRun.prompt}
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={COPY.createRun.promptPlaceholder}
              rows={4}
              className="w-full bg-[var(--surface-3)] border border-[var(--border)] terminal-input px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-mono text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-colors"
            >
              {COPY.createRun.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !siteId || !prompt.trim()}
              className="btn-neon px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? COPY.createRun.submitting : COPY.createRun.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
