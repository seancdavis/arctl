# CLAUDE.md

Agent Runner Kanban - A kanban board for managing Netlify Agent Runs across all user sites.

## Tech Stack

- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS + Zustand
- **Backend**: Netlify Functions (serverless)
- **Database**: Netlify DB (Neon PostgreSQL) with Drizzle ORM
- **API**: Netlify Agent Runners API (api.netlify.com/v1)
- **Routing**: react-router-dom (client-side routing)

## Project Structure

```
db/
  schema.ts          # Drizzle schema (runs, sessions, sites, syncState)
  index.ts           # DB connection via @netlify/neon
migrations/          # Drizzle migrations (auto-generated)
netlify/functions/
  runs.mts           # GET/POST /api/runs
  run.mts            # GET/PATCH /api/runs/:id (?sync=true for live refresh)
  run-sessions.mts   # POST /api/runs/:id/sessions
  run-pr.mts         # POST /api/runs/:id/pull-request (create + update)
  run-pr-status.mts  # GET /api/runs/:id/pr-status (GitHub CI/review status)
  sites.mts          # GET /api/sites (cached)
  sync-trigger.mts   # POST /api/sync/trigger
  sync-worker-background.mts  # Background sync worker
src/
  api/               # Frontend API clients (runsApi, sitesApi, syncApi)
  components/
    archive/         # ArchiveView
    kanban/          # KanbanBoard, KanbanColumn, KanbanCard
    layout/          # Header, Sidebar (desktop + mobile bottom nav), ViewToggle
    runs/            # RunDetailPanel (slide-out), CreateRunModal, AddSessionForm, SitePicker
    settings/        # SettingsView
    sync/            # SyncStatus
    ui/              # Shared UI primitives (Skeleton)
  hooks/             # useRuns, useSites, useSyncStatus, useActiveRunPolling
  store/             # Zustand store (kanbanStore.ts)
  types/             # TypeScript types (runs.ts)
```

## Key Implementation Details

### Database Schema (Drizzle)
- **runs**: id, siteId, siteName, title, state, branch, pullRequestUrl, pullRequestState, pullRequestBranch, deployPreviewUrl, timestamps (with timezone), prCommittedAt, prNeedsUpdate, prCheckStatus, customNotes, archivedAt
- **sessions**: id, runId, state, prompt, timestamps (with timezone)
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

### UI Patterns
- **Slide-out detail panel**: Clicking a kanban card navigates to `/runs/:id` and opens a right-side panel. Board stays visible (dimmed) behind backdrop. Nested route via `<Outlet />` in KanbanBoard.
- **Sidebar**: Collapsible desktop sidebar (60px collapsed, ~200px expanded) + mobile bottom nav. Uses CSS custom properties for theming.
- **Neon accent palette**: Cyan `#00d4ff`, green `#00ff9d`, red `#ff3b5c`. `btn-neon` CSS class for primary action buttons (gradient + glow).

### Environment Variables
- `NETLIFY_PAT` - Netlify Personal Access Token (required)
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

### Not Yet Implemented
- [ ] Diff viewer for run changes
- [ ] Filter/search runs by site or branch
- [ ] Custom notes on runs (schema exists, UI not built)

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
| runs.mts | `/api/runs` | GET, POST | `?archived=true` for archived runs |
| run.mts | `/api/runs/:id` | GET, PATCH | `?sync=true` fetches from Netlify API first |
| run-sessions.mts | `/api/runs/:id/sessions` | GET, POST | |
| run-pr.mts | `/api/runs/:id/pull-request` | POST | `{action:"update"}` to commit to PR branch |
| run-pr-status.mts | `/api/runs/:id/pr-status` | GET | GitHub CI checks, reviews, mergeability |
| sites.mts | `/api/sites` | GET | Cached 5 min |
| sync-trigger.mts | `/api/sync/trigger` | GET, POST | |
| sync-worker-background.mts | `/api/sync/worker` | POST | Background function |

When functions call other functions internally, use `new URL(req.url).origin` to get the base URL.

## Notes

- All API responses use **camelCase** (matches Drizzle schema)
- Frontend types in `src/types/runs.ts` must match Drizzle schema
- Sync worker logs prefixed with `[sync-worker]`, trigger with `[sync-trigger]`
- Sites are cached for 5 minutes before re-fetching from Netlify API
- Netlify API returns lowercase state values - always normalize to UPPERCASE when storing
- Netlify Agent Runners API uses `agent` field (claude/gemini/codex), not `model`
