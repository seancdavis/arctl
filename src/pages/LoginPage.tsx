import { COPY } from "../copy";

export function LoginPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-0)] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <h1 className="font-mono text-3xl font-bold text-[var(--accent-blue)] mb-2">
          {COPY.auth.heading}
        </h1>
        <p className="text-[var(--text-secondary)] mb-8">
          {COPY.auth.subheading}
        </p>
        <a
          href="/api/auth/login"
          className="btn-neon inline-flex items-center gap-2 px-6 py-3 text-base"
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
              d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
            />
          </svg>
          {COPY.auth.signIn}
        </a>
      </div>
    </div>
  );
}
