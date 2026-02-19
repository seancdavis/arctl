import { useState } from "react";
import { useKanbanStore } from "../../store/kanbanStore";

const SCOPE_OPTIONS = [
  {
    value: "agent_runners:read",
    label: "Read",
    description: "List and view runners, sessions, and diffs",
    risk: "Low",
    riskColor: "text-[var(--accent-green)]",
  },
  {
    value: "agent_runners:write",
    label: "Write",
    description: "Create, update, and stop runners and sessions",
    risk: "Medium",
    riskColor: "text-yellow-400",
  },
  {
    value: "agent_runners:deploy",
    label: "Deploy",
    description: "Create PRs, commit to branches, redeploy",
    risk: "High",
    riskColor: "text-[var(--accent-red)]",
  },
] as const;

const EXPIRY_OPTIONS = [
  { value: "", label: "Never" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
] as const;

interface CreateApiKeyFormProps {
  onSubmit: (data: {
    name: string;
    siteId: string;
    siteName: string;
    scopes: string[];
    expiresAt?: string;
  }) => void;
  isSubmitting: boolean;
}

export function CreateApiKeyForm({
  onSubmit,
  isSubmitting,
}: CreateApiKeyFormProps) {
  const { sites } = useKanbanStore();
  const [name, setName] = useState("");
  const [siteId, setSiteId] = useState("");
  const [scopes, setScopes] = useState<string[]>(["agent_runners:read"]);
  const [expiryDays, setExpiryDays] = useState("");

  const selectedSite = sites.find((s) => s.id === siteId);

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !siteId || scopes.length === 0) return;

    const data: Parameters<typeof onSubmit>[0] = {
      name: name.trim(),
      siteId,
      siteName: selectedSite?.name || siteId,
      scopes,
    };

    if (expiryDays) {
      const expires = new Date();
      expires.setDate(expires.getDate() + parseInt(expiryDays, 10));
      data.expiresAt = expires.toISOString();
    }

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
          Key Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. CI Agent Key"
          required
          className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-blue)]"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
          Site
        </label>
        <select
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          required
          className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
        >
          <option value="">Select a site...</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
          Scopes
        </label>
        <div className="space-y-2">
          {SCOPE_OPTIONS.map((scope) => (
            <label
              key={scope.value}
              className="flex items-start gap-2.5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={scopes.includes(scope.value)}
                onChange={() => toggleScope(scope.value)}
                className="mt-0.5 accent-[var(--accent-blue)]"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--text-primary)]">
                    {scope.label}
                  </span>
                  <span className={`text-[10px] font-medium ${scope.riskColor}`}>
                    {scope.risk}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {scope.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
          Expiration
        </label>
        <select
          value={expiryDays}
          onChange={(e) => setExpiryDays(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
        >
          {EXPIRY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !name.trim() || !siteId || scopes.length === 0}
        className="btn-neon w-full px-4 py-2.5 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Creating..." : "Create API Key"}
      </button>
    </form>
  );
}
