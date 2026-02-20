import { useEffect, useState, useCallback } from "react";
import {
  fetchApiKeys,
  createApiKey,
  revokeApiKey,
  type ApiKeyInfo,
} from "../api/apiKeysApi";
import { ApiKeyList } from "../components/api-keys/ApiKeyList";
import { CreateApiKeyForm } from "../components/api-keys/CreateApiKeyForm";
import { ApiKeyRevealModal } from "../components/api-keys/ApiKeyRevealModal";

export function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revealKey, setRevealKey] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      const data = await fetchApiKeys();
      setKeys(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async (data: Parameters<typeof createApiKey>[0]) => {
    setCreating(true);
    setError(null);
    try {
      const result = await createApiKey(data);
      setRevealKey(result.rawKey);
      setShowForm(false);
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    setError(null);
    try {
      await revokeApiKey(id);
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke key");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            API Keys
          </h2>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            Scoped keys for agent access to the Netlify Agent Runners API
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-neon px-4 py-2 rounded-lg text-sm flex items-center gap-2"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Key
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/20 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Create API Key
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
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
          <CreateApiKeyForm onSubmit={handleCreate} isSubmitting={creating} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <ApiKeyList keys={keys} onRevoke={handleRevoke} revoking={revoking} />
      )}

      {revealKey && (
        <ApiKeyRevealModal
          rawKey={revealKey}
          onClose={() => setRevealKey(null)}
        />
      )}
    </div>
  );
}
