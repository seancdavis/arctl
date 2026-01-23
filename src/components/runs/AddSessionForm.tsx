import { useState } from "react";

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
      setError(err instanceof Error ? err.message : "Failed to add session");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="text-red-600 text-xs">{error}</div>
      )}

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter follow-up prompt..."
        rows={3}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
      />

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !prompt.trim()}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Add Session"}
        </button>
      </div>
    </form>
  );
}
