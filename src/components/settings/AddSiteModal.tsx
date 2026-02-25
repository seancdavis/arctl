import { useState, useEffect } from "react";
import { fetchAccounts, fetchAccountSites } from "../../api/sitesApi";
import type { Account, AccountSite, Site } from "../../types/runs";
import { COPY } from "../../copy";

interface AddSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSite: (id: string, name: string) => Promise<unknown>;
  existingSites: Site[];
}

export function AddSiteModal({
  isOpen,
  onClose,
  onAddSite,
  existingSites,
}: AddSiteModalProps) {
  const [step, setStep] = useState<"team" | "site">("team");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountSites, setAccountSites] = useState<AccountSite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const existingIds = new Set(existingSites.map((s) => s.id));

  useEffect(() => {
    if (!isOpen) return;
    setStep("team");
    setAccounts([]);
    setAccountSites([]);
    setIsLoading(true);

    fetchAccounts()
      .then(setAccounts)
      .catch(() => setAccounts([]))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const handleSelectAccount = async (account: Account) => {
    setStep("site");
    setIsLoading(true);
    setAccountSites([]);

    try {
      const sites = await fetchAccountSites(account.slug);
      setAccountSites(sites);
    } catch {
      setAccountSites([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSite = async (site: AccountSite) => {
    if (existingIds.has(site.id) || isAdding) return;
    setIsAdding(true);
    try {
      await onAddSite(site.id, site.name);
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setIsAdding(false);
    }
  };

  const handleBack = () => {
    setStep("team");
    setAccountSites([]);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-site-title"
    >
      <div className="bg-[var(--surface-2)] shadow-2xl w-full max-w-lg mx-4 border border-[var(--border)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            {step === "site" && (
              <button
                onClick={handleBack}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                aria-label={COPY.settings.back}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2
              id="add-site-title"
              className="text-lg font-mono font-semibold text-[var(--text-primary)]"
            >
              {step === "team" ? COPY.settings.pickTeam : COPY.settings.pickSite}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={COPY.generic.close}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="px-6 py-8 text-center font-mono text-[var(--text-secondary)]">
              {step === "team" ? COPY.settings.loadingTeams : COPY.settings.loadingSites}
            </div>
          ) : step === "team" ? (
            accounts.length === 0 ? (
              <div className="px-6 py-8 text-center font-mono text-[var(--text-secondary)]">
                {COPY.settings.noTeams}
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => handleSelectAccount(account)}
                    className="w-full text-left px-6 py-3 hover:bg-[var(--surface-3)]/50 transition-colors"
                  >
                    <p className="font-mono font-medium text-[var(--text-primary)]">
                      {account.name}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] font-mono">
                      {account.slug}
                    </p>
                  </button>
                ))}
              </div>
            )
          ) : accountSites.length === 0 ? (
            <div className="px-6 py-8 text-center font-mono text-[var(--text-secondary)]">
              {COPY.settings.noSitesInTeam}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {accountSites.map((site) => {
                const alreadyAdded = existingIds.has(site.id);
                return (
                  <button
                    key={site.id}
                    onClick={() => handleSelectSite(site)}
                    disabled={alreadyAdded || isAdding}
                    className={`w-full text-left px-6 py-3 transition-colors ${
                      alreadyAdded
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-[var(--surface-3)]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-mono font-medium text-[var(--text-primary)]">
                        {site.name}
                      </p>
                      {alreadyAdded && (
                        <span className="text-xs font-mono text-[var(--text-tertiary)]">
                          {COPY.settings.alreadyAdded}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
