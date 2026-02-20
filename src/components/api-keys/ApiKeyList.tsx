import type { ApiKeyInfo } from "../../api/apiKeysApi";
import { COPY } from "../../copy";

interface ApiKeyListProps {
  keys: ApiKeyInfo[];
  onRevoke: (id: string) => void;
  revoking: string | null;
}

function getKeyStatus(key: ApiKeyInfo): {
  label: string;
  color: string;
} {
  if (key.isRevoked) {
    return { label: COPY.apiKeys.statusRevoked, color: "text-[var(--accent-red)]" };
  }
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
    return { label: COPY.apiKeys.statusExpired, color: "text-[var(--text-tertiary)]" };
  }
  return { label: COPY.apiKeys.statusActive, color: "text-[var(--accent-green)]" };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return COPY.generic.never;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ApiKeyList({ keys, onRevoke, revoking }: ApiKeyListProps) {
  if (keys.length === 0) {
    return (
      <p className="text-[var(--text-tertiary)] text-sm font-mono py-8 text-center">
        {COPY.apiKeys.noKeys}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {keys.map((key) => {
        const status = getKeyStatus(key);
        const isActive = !key.isRevoked && !(key.expiresAt && new Date(key.expiresAt) < new Date());

        return (
          <div
            key={key.id}
            className="bg-[var(--surface-2)] border border-[var(--border)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-medium text-[var(--text-primary)] text-sm">
                    {key.name}
                  </span>
                  <span className={`text-xs font-mono font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-[var(--text-tertiary)]">
                  <span>{key.keyPrefix}...</span>
                  {key.siteName && <span>{key.siteName}</span>}
                  <span>{COPY.apiKeys.created(formatDate(key.createdAt))}</span>
                  <span>{COPY.apiKeys.lastUsed(formatDate(key.lastUsedAt))}</span>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {key.scopes.map((scope) => (
                    <span
                      key={scope}
                      className="text-[10px] font-mono px-1.5 py-0.5 bg-[var(--surface-3)] text-[var(--text-secondary)] border border-[var(--border)]"
                    >
                      {scope.replace("agent_runners:", "")}
                    </span>
                  ))}
                </div>
              </div>
              {isActive && (
                <button
                  onClick={() => onRevoke(key.id)}
                  disabled={revoking === key.id}
                  className="text-xs font-mono text-[var(--accent-red)] hover:text-[var(--accent-red)]/80 transition-colors shrink-0 disabled:opacity-50"
                >
                  {revoking === key.id ? COPY.apiKeys.revoking : COPY.apiKeys.revoke}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
