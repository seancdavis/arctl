import { useState } from "react";
import type { Note } from "../../types/runs";
import { COPY } from "../../copy";

const NOTE_COLLAPSE_LENGTH = 200;

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NoteCard({ note }: { note: Note }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = note.content.length > NOTE_COLLAPSE_LENGTH;

  return (
    <div className="bg-[var(--surface-3)] px-3 py-2.5 text-sm">
      <div className="flex items-center mb-1">
        <span className="text-[var(--text-tertiary)] text-xs font-mono">
          {formatDate(note.createdAt)}
        </span>
      </div>
      <div>
        <p className={`text-[var(--text-secondary)] whitespace-pre-wrap break-words ${!expanded && isLong ? "line-clamp-3" : ""}`}>
          {note.content}
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
    </div>
  );
}
