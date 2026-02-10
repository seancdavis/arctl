import { useState } from "react";
import { addNote } from "../../api/runsApi";

interface AddNoteFormProps {
  runId: string;
  onNoteAdded: () => void;
  onCancel: () => void;
}

export function AddNoteForm({ runId, onNoteAdded, onCancel }: AddNoteFormProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await addNote(runId, { content: content.trim() });
      setContent("");
      onNoteAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="text-red-400 text-xs">{error}</div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a note..."
        rows={3}
        className="w-full bg-[var(--surface-3)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent resize-none"
      />

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="btn-neon px-3 py-1.5 text-sm rounded-lg disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Add Note"}
        </button>
      </div>
    </form>
  );
}
