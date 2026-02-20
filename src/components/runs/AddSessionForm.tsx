import { useState } from "react";
import { COPY } from "../../copy";

interface AddSessionFormProps {
  runId: string;
  onAddSession: (runId: string, prompt: string) => Promise<void>;
  onCancel: () => void;
}

export function AddSessionForm({
  runId,
  onAddSession,
  onCancel,
}: AddSessionFormProps) {
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onAddSession(runId, prompt.trim());
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : COPY.addSession.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="text-[var(--accent-red)] text-xs font-mono">{error}</div>
      )}

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={COPY.addSession.placeholder}
        rows={3}
        className="w-full bg-[var(--surface-3)] border border-[var(--border)] terminal-input px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent resize-none"
      />

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm font-mono text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          {COPY.addSession.cancel}
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !prompt.trim()}
          className="btn-neon px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {isSubmitting ? COPY.addSession.submitting : COPY.addSession.submit}
        </button>
      </div>
    </form>
  );
}
