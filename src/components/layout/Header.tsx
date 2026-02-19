import { useState, useRef, useEffect } from "react";
import { useKanbanStore } from "../../store/kanbanStore";
import { useAuth } from "../../lib/auth";
import { SyncStatus } from "../sync/SyncStatus";
import { SiteFilter } from "../kanban/SiteFilter";

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!user) return null;

  const initials = user.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.charAt(0).toUpperCase() || "?";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="User menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="w-7 h-7 rounded-full border border-[var(--border)]"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[var(--surface-3)] border border-[var(--border)] flex items-center justify-center text-xs font-medium text-[var(--text-secondary)]">
            {initials}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg shadow-xl shadow-black/40 z-50 py-1">
          <div className="px-3 py-2 border-b border-[var(--border)]">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {user.fullName || user.email}
            </p>
            {user.fullName && user.email && (
              <p className="text-xs text-[var(--text-tertiary)] truncate">
                {user.email}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { openCreateModal } = useKanbanStore();

  return (
    <header className="bg-[var(--surface-1)] border-b border-[var(--border)] px-4 md:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-[var(--text-primary)] truncate">
            Agent Runner Kanban
          </h1>
          <SiteFilter />
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <div className="hidden sm:block">
            <SyncStatus />
          </div>
          <button
            onClick={openCreateModal}
            className="btn-neon px-3 md:px-4 py-2 rounded-lg flex items-center gap-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="hidden sm:inline">New Run</span>
          </button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
