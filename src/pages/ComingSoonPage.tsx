import { useAuth } from "../lib/auth";

export function ComingSoonPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--surface-0)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--surface-3)] border border-[var(--border)] flex items-center justify-center">
          <svg
            className="w-8 h-8 text-[var(--accent-blue)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          You're on the list
        </h1>
        {user?.fullName && (
          <p className="text-[var(--text-secondary)] mb-2">
            Hey {user.fullName}!
          </p>
        )}
        <p className="text-[var(--text-tertiary)] mb-8">
          Access to Agent Runner Kanban is currently limited. We'll let you know
          when it's your turn.
        </p>
        <button
          onClick={logout}
          className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors underline underline-offset-2"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
