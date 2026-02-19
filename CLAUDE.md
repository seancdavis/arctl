# CLAUDE.md

Agent Runner Kanban - A kanban board for managing Netlify Agent Runs across all user sites.

## Skills

This project uses the `seancdavis-skills` plugin. When skill instructions conflict with patterns in this file, defer to the skills.

Relevant skills:
- `vite-best-practices` - Vite + React SPA conventions, Netlify Vite plugin, client-side routing
- `data-storage` - Drizzle ORM schema, migrations, and Netlify DB patterns
- `netlify-functions` - Serverless function syntax, config, and API route patterns
- `ui-design` - Tailwind CSS usage, component patterns, accessibility baseline
- `environment-variables` - Environment variable management for Netlify projects

## Tech Stack

- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS + Zustand
- **Backend**: Netlify Functions (serverless)
- **Database**: Netlify DB (Neon PostgreSQL) with Drizzle ORM
- **API**: Netlify Agent Runners API (api.netlify.com/v1)
- **Auth**: Netlify OAuth + HMAC session cookies
- **Routing**: react-router-dom (client-side routing)

## Project Structure

```
db/
  schema.ts          # Drizzle schema (users, runs, sessions, notes, apiKeys, auditLog, sites, syncState)
  index.ts           # DB connection via @netlify/neon
migrations/          # Drizzle migrations (auto-generated)
netlify/functions/
  _shared/           # Shared utilities (session, scopes, origin, auth)
  auth-login.mts     # GET /api/auth/login (OAuth redirect)
  auth-callback.mts  # GET /api/auth/callback (OAuth token exchange)
  auth-logout.mts    # GET,POST /api/auth/logout
  auth-session.mts   # GET /api/auth/session (current user + allowlist check)
  runs.mts           # GET/POST /api/runs
  run.mts            # GET/PATCH /api/runs/:id (?sync=true for live refresh)
  run-sessions.mts   # POST /api/runs/:id/sessions
  run-pr.mts         # POST /api/runs/:id/pull-request (create + update)
  run-notes.mts      # GET/POST /api/runs/:id/notes
  run-pr-status.mts  # GET /api/runs/:id/pr-status (GitHub CI/review status)
  api-keys.mts       # GET/POST/DELETE /api/keys (API key management)
  proxy.mts          # ALL /api/proxy/* (Netlify API proxy with API key auth)
  sites.mts          # GET /api/sites (cached)
  sync-trigger.mts   # POST /api/sync/trigger
  sync-worker-background.mts  # Background sync worker
src/
  api/               # Frontend API clients (runsApi, sitesApi, syncApi, apiKeysApi, fetchWithAuth)
  components/
    api-keys/        # ApiKeyList, CreateApiKeyForm, ApiKeyRevealModal
    archive/         # ArchiveView
    kanban/          # KanbanBoard, KanbanColumn, KanbanCard
    layout/          # Header (with UserMenu), Sidebar (desktop + mobile bottom nav)
    runs/            # RunDetailPanel (slide-out), CreateRunModal, AddSessionForm, SitePicker
    settings/        # SettingsView
    sync/            # SyncStatus
    ui/              # Shared UI primitives (Skeleton)
  hooks/             # useRuns, useSites, useSyncStatus, useActiveRunPolling
  lib/               # auth.tsx (AuthProvider + useAuth hook)
  pages/             # LoginPage, ComingSoonPage, ApiKeysPage
  store/             # Zustand store (kanbanStore.ts)
  types/             # TypeScript types (runs.ts)
```

## Key Implementation Details

### Authentication & Authorization
- **Netlify OAuth**: Users sign in via Netlify OAuth. Access token stored in `users` table.
- **Session cookies**: HMAC-SHA256 signed `oc_session` cookie, 7-day TTL.
- **Allowlist**: `ALLOWED_NETLIFY_USER_IDS` env var controls who can access the app. Non-allowed users see a "coming soon" page.
- **Auth gate**: `AuthProvider` in `src/lib/auth.tsx` wraps the app. `AuthGate` in `App.tsx` renders LoginPage/ComingSoonPage based on auth status.
- **`requireAuth(req)`**: Central helper in `_shared/auth.mts` — validates session, checks allowlist, returns `{ userId, accessToken, user }`.
- **All API routes** (except auth-* and proxy) use `requireAuth()` at the top.
- **Frontend API clients** use `fetchWithAuth()` wrapper that redirects to login on 401.

### API Key Proxy System
- Users create scoped API keys (`oc_` prefix) tied to a specific site.
- Three scopes: `agent_runners:read`, `agent_runners:write`, `agent_runners:deploy`.
- Proxy endpoint (`/api/proxy/*`) validates key, checks scopes, injects site_id, forwards to Netlify API using key owner's OAuth token.
- All proxy requests logged to `audit_log` table.

### Database Schema (Drizzle)
- **users**: id (uuid), netlifyUserId, email, fullName, avatarUrl, accessToken, timestamps
- **runs**: id, siteId, siteName, title, state, branch, pullRequestUrl, pullRequestState, pullRequestBranch, deployPreviewUrl, timestamps (with timezone), prCommittedAt, prNeedsUpdate, prCheckStatus, archivedAt, userId (FK→users, nullable)
- **sessions**: id, runId, state, prompt, timestamps (with timezone)
- **notes**: id, runId, content, createdAt (with timezone), userId (FK→users, nullable)
- **apiKeys**: id (uuid), userId (FK→users), keyHash (unique), keyPrefix, name, siteId, siteName, scopes (jsonb), expiresAt, isRevoked, lastUsedAt, createdAt
- **auditLog**: id (uuid), apiKeyId (FK→apiKeys), userId (FK→users), action, siteId, netlifyEndpoint, statusCode, createdAt
- **sites**: id, name, updatedAt, syncEnabled
- **syncState**: lastSyncAt, nextSyncAt, backoffSeconds, consecutiveNoChange

All timestamp columns use `timestamp({ withTimezone: true })` to ensure correct local time display.

### Kanban Columns
| Column | State | Description |
|--------|-------|-------------|
| New | `NEW` | Freshly created / queued runs |
| Running | `RUNNING` | Currently executing |
| Done | `DONE` (no PR) | Completed, needs review |
| PR Open | `DONE` (has PR, not merged) | PR created and open |
| PR Merged | `DONE` (PR merged) | PR merged |
| Error | `ERROR` | Failed runs |

Column mapping logic is in `src/types/runs.ts` (`getKanbanColumn`). Archived runs are excluded from all columns.

### Sync & Polling Architecture
Three-tier approach:

1. **Global sync** (backoff-based): Triggered on app load and manual refresh button. Background worker syncs all enabled sites with Netlify API. Exponential backoff: 30s → 1m → 2m → 5m → ... → 4 days max. Resets on state changes or manual refresh.

2. **Per-run polling** (`useActiveRunPolling`): Polls individual NEW/RUNNING runs every 15s via `GET /api/runs/:id?sync=true`. Updates Zustand store so cards move columns in near-real-time.

3. **Detail panel polling** (`RunDetailPanel`): When the slide-out panel is open and the run is in a mutable state (not merged), polls every 15s to keep panel data fresh.

The `?sync=true` query param on `/api/runs/:id` fetches from Netlify API, updates the local DB, then returns fresh data.

**Sync worker token handling**: The background worker has no session cookie. `sync-trigger.mts` passes the user's `accessToken` in the request body. The worker reads it from the body with a fallback to `NETLIFY_PAT` as a safety net.

### UI Patterns
- **Slide-out detail panel**: Clicking a kanban card navigates to `/runs/:id` and opens a right-side panel. Board stays visible (dimmed) behind backdrop. Nested route via `<Outlet />` in KanbanBoard.
- **Sidebar**: Collapsible desktop sidebar (60px collapsed, ~200px expanded) + mobile bottom nav. Uses CSS custom properties for theming.
- **Neon accent palette**: Cyan `#00d4ff`, green `#00ff9d`, red `#ff3b5c`. `btn-neon` CSS class for primary action buttons (gradient + glow).
- **User menu**: Avatar/initials in Header with sign-out dropdown.

### Environment Variables
- `NETLIFY_OAUTH_CLIENT_ID` - OAuth app client ID (from app.netlify.com/user/applications)
- `NETLIFY_OAUTH_CLIENT_SECRET` - OAuth app secret
- `SESSION_SECRET` - Random hex string for HMAC cookie signing (`openssl rand -hex 32`)
- `ALLOWED_NETLIFY_USER_IDS` - Comma-separated Netlify user IDs for access allowlist
- `NETLIFY_REDIRECT_URI` - Full callback URL (e.g., `https://your-app.netlify.app/api/auth/callback`)
- `NETLIFY_PAT` - Fallback-only for sync worker when no user token available
- `GITHUB_PAT` - GitHub Personal Access Token (required for PR status checks)
- `NETLIFY_DATABASE_URL` - Auto-provisioned by Netlify DB

## Development Commands

```bash
npm run dev          # Start dev server (with Netlify functions)
npm run build        # Build for production
npm run db:generate  # Generate Drizzle migration
npm run db:migrate   # Run migrations (via netlify dev:exec)
npm run db:push      # Push schema directly to DB (bypasses migrations)
npm run db:studio    # Open Drizzle Studio
```

## Current Status

### Completed
- [x] Full kanban board UI with 6 columns (New, Running, Done, PR Open, PR Merged, Error)
- [x] Create runs via Netlify API (defaults to Claude agent)
- [x] Add follow-up sessions to runs
- [x] Create PRs from completed runs
- [x] Archive/restore runs
- [x] Background sync with exponential backoff
- [x] Per-run polling for active runs (NEW/RUNNING)
- [x] Detail panel polling for mutable runs
- [x] Manual refresh button
- [x] Drizzle ORM integration (timezone-aware timestamps)
- [x] Slide-out run detail panel with sessions, metadata, and actions
- [x] Collapsible sidebar + mobile bottom nav
- [x] Client-side routing (react-router-dom)

- [x] Update PR (commit follow-up sessions to existing PR branch)
- [x] PR commit tracking (prCommittedAt, prNeedsUpdate, session "Not in PR" badges)
- [x] GitHub PR status integration (CI checks, review state, mergeability)

- [x] Timestamped notes on runs (add/view notes in run detail panel)

- [x] Netlify OAuth authentication (login/callback/logout/session)
- [x] Session cookie auth (HMAC-SHA256, 7-day TTL)
- [x] User allowlist via ALLOWED_NETLIFY_USER_IDS env var
- [x] Auth gate (LoginPage, ComingSoonPage, AuthGate wrapper)
- [x] All API routes protected with requireAuth()
- [x] OAuth tokens replace NETLIFY_PAT for all Netlify API calls
- [x] User menu in Header (avatar + sign-out dropdown)
- [x] API key management (create, list, revoke) with scoped permissions
- [x] Netlify API proxy with API key auth (/api/proxy/*)
- [x] Audit logging for proxy requests
- [x] Frontend 401 handling (auto-redirect to login)

### Not Yet Implemented
- [ ] Diff viewer for run changes
- [ ] Filter/search runs by site or branch

## Netlify Primitives Reference

See `.agents/` directory for documentation:
- `netlify-agent-runners.md` - Agent Runners API endpoints
- `netlify-agent-runner-response-examples.md` - Real API response examples
- `netlify-db.md` - Database (using Drizzle ORM, not raw SQL)
- `netlify-serverless.md` - Functions patterns
- `netlify-blobs.md`, `netlify-env-variables.md`, etc.

## API Routes

All Netlify Functions must use clean `/api` routes via the `config.path` export. Never use `/.netlify/functions/` paths.

| Function | Route | Methods | Notes |
|----------|-------|---------|-------|
| auth-login.mts | `/api/auth/login` | GET | Redirects to Netlify OAuth |
| auth-callback.mts | `/api/auth/callback` | GET | OAuth token exchange, upserts user |
| auth-logout.mts | `/api/auth/logout` | GET, POST | Clears session cookie |
| auth-session.mts | `/api/auth/session` | GET | Returns user + isAllowed |
| runs.mts | `/api/runs` | GET, POST | `?archived=true` for archived runs |
| run.mts | `/api/runs/:id` | GET, PATCH | `?sync=true` fetches from Netlify API first |
| run-sessions.mts | `/api/runs/:id/sessions` | GET, POST | |
| run-notes.mts | `/api/runs/:id/notes` | GET, POST | Local notes, no Netlify API |
| run-pr.mts | `/api/runs/:id/pull-request` | POST | `{action:"update"}` to commit to PR branch |
| run-pr-status.mts | `/api/runs/:id/pr-status` | GET | GitHub CI checks, reviews, mergeability |
| api-keys.mts | `/api/keys`, `/api/keys/:id` | GET, POST, DELETE | API key CRUD |
| proxy.mts | `/api/proxy/*` | ALL | Netlify API proxy with API key auth |
| sites.mts | `/api/sites` | GET | Cached 5 min |
| sync-trigger.mts | `/api/sync/trigger` | GET, POST | |
| sync-worker-background.mts | `/api/sync/worker` | POST | Background function |

When functions call other functions internally, use `new URL(req.url).origin` to get the base URL.

### Proxy Usage (for agents)

Agents use the proxy endpoint with an API key to access the Netlify Agent Runners API:

```bash
# List runners for the key's site
curl -H "Authorization: Bearer oc_..." https://your-app.netlify.app/api/proxy/agent_runners

# Create a runner
curl -X POST -H "Authorization: Bearer oc_..." \
  -H "Content-Type: application/json" \
  -d '{"prompt":"...","agent":"claude"}' \
  https://your-app.netlify.app/api/proxy/agent_runners

# Get a specific runner
curl -H "Authorization: Bearer oc_..." \
  https://your-app.netlify.app/api/proxy/agent_runners/RUNNER_ID
```

The proxy automatically injects `site_id` for collection endpoints and verifies runner ownership for item endpoints.

### Scope System

| Scope | Grants | Risk |
|-------|--------|------|
| `agent_runners:read` | GET on any agent_runners path | Low |
| `agent_runners:write` | POST/PATCH/PUT/DELETE on agent_runners | Medium |
| `agent_runners:deploy` | Actions on pull_request, commit, redeploy, deploy | High |

## Notes

- All API responses use **camelCase** (matches Drizzle schema)
- Frontend types in `src/types/runs.ts` must match Drizzle schema
- Sync worker logs prefixed with `[sync-worker]`, trigger with `[sync-trigger]`
- Sites are cached for 5 minutes before re-fetching from Netlify API
- Netlify API returns lowercase state values - always normalize to UPPERCASE when storing
- Netlify Agent Runners API uses `agent` field (claude/gemini/codex), not `model`
- `NETLIFY_PAT` is now fallback-only (used by sync worker when no user token is passed)
- `userId` columns on runs/notes are nullable for backward compatibility with existing data
