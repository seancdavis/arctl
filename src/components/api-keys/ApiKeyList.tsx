import type { ApiKeyInfo } from "../../api/apiKeysApi";

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
    return { label: "Revoked", color: "text-[var(--accent-red)]" };
  }
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
    return { label: "Expired", color: "text-[var(--text-tertiary)]" };
  }
  return { label: "Active", color: "text-[var(--accent-green)]" };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ApiKeyList({ keys, onRevoke, revoking }: ApiKeyListProps) {
  if (keys.length === 0) {
    return (
      <p className="text-[var(--text-tertiary)] text-sm py-8 text-center">
        No API keys yet. Create one to get started.
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
            className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-[var(--text-primary)] text-sm">
                    {key.name}
                  </span>
                  <span className={`text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-tertiary)]">
                  <span className="font-mono">{key.keyPrefix}...</span>
                  {key.siteName && <span>{key.siteName}</span>}
                  <span>Created {formatDate(key.createdAt)}</span>
                  <span>Last used {formatDate(key.lastUsedAt)}</span>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {key.scopes.map((scope) => (
                    <span
                      key={scope}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-secondary)] border border-[var(--border)]"
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
                  className="text-xs text-[var(--accent-red)] hover:text-[var(--accent-red)]/80 transition-colors shrink-0 disabled:opacity-50"
                >
                  {revoking === key.id ? "Revoking..." : "Revoke"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
