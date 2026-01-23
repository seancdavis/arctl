import { useState } from "react";
import type { Run } from "../../types/runs";

interface KanbanCardProps {
  run: Run;
  onArchive: (id: string) => void;
  onCreatePR: (id: string) => void;
  onAddSession: (runId: string, prompt: string) => Promise<void>;
}

export function KanbanCard({
  run,
  onArchive,
  onCreatePR,
  onAddSession,
}: KanbanCardProps) {
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionPrompt, setSessionPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSession = async () => {
    if (!sessionPrompt.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddSession(run.id, sessionPrompt);
      setSessionPrompt("");
      setShowSessionForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
          {run.title || "Untitled Run"}
        </h3>
        <button
          onClick={() => onArchive(run.id)}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          title="Archive"
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
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
            />
          </svg>
        </button>
      </div>

      <div className="text-xs text-gray-500 mb-2">
        <div className="flex items-center gap-1 mb-1">
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
          <span>{run.site_name || "Unknown Site"}</span>
        </div>
        {run.branch && (
          <div className="flex items-center gap-1">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <span className="truncate">{run.branch}</span>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400 mb-3">
        {formatDate(run.created_at)}
      </div>

      {run.pull_request_url && (
        <a
          href={run.pull_request_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mb-2"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
            <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z" />
          </svg>
          View PR
        </a>
      )}

      {run.deploy_preview_url && (
        <a
          href={run.deploy_preview_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 mb-2"
        >
          <svg
            className="w-3 h-3"
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
          Preview
        </a>
      )}

      <div className="flex flex-wrap gap-1">
        {run.state === "DONE" && !run.pull_request_url && (
          <button
            onClick={() => onCreatePR(run.id)}
            className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
          >
            Create PR
          </button>
        )}

        {(run.state === "DONE" || run.state === "ERROR") && (
          <button
            onClick={() => setShowSessionForm(!showSessionForm)}
            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
          >
            + Follow-up
          </button>
        )}
      </div>

      {showSessionForm && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <textarea
            value={sessionPrompt}
            onChange={(e) => setSessionPrompt(e.target.value)}
            placeholder="Enter follow-up prompt..."
            className="w-full text-xs p-2 border border-gray-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={2}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleAddSession}
              disabled={isSubmitting || !sessionPrompt.trim()}
              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Adding..." : "Add"}
            </button>
            <button
              onClick={() => {
                setShowSessionForm(false);
                setSessionPrompt("");
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
