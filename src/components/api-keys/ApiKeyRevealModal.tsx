import { useState } from "react";
import { COPY } from "../../copy";

interface ApiKeyRevealModalProps {
  rawKey: string;
  onClose: () => void;
}

export function ApiKeyRevealModal({ rawKey, onClose }: ApiKeyRevealModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="api-key-reveal-title">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[var(--surface-1)] border border-[var(--border)] shadow-2xl max-w-lg w-full p-6">
        <h3 id="api-key-reveal-title" className="text-lg font-mono font-bold text-[var(--text-primary)] mb-2">
          {COPY.apiKeys.revealTitle}
        </h3>
        <p className="text-sm font-mono text-[var(--accent-red)] mb-4">
          {COPY.apiKeys.revealWarning}
        </p>

        <div className="relative mb-4">
          <code className="block w-full p-3 text-xs font-mono bg-[var(--surface-0)] border border-[var(--border)] text-[var(--accent-green)] break-all select-all">
            {rawKey}
          </code>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="btn-neon flex-1 px-4 py-2.5 text-sm flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {COPY.apiKeys.copied}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                {COPY.apiKeys.copy}
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-mono bg-[var(--surface-3)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-4)] transition-colors"
          >
            {COPY.apiKeys.done}
          </button>
        </div>
      </div>
    </div>
  );
}
