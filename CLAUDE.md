# CLAUDE.md

Agent Runner Kanban - A kanban board for managing Netlify Agent Runs across all user sites.

## Tech Stack

- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS + Zustand
- **Backend**: Netlify Functions (serverless)
- **Database**: Netlify DB (Neon PostgreSQL) with Drizzle ORM
- **API**: Netlify Agent Runners API (api.netlify.com/v1)

## Project Structure

```
db/
  schema.ts          # Drizzle schema (runs, sessions, sites, syncState)
  index.ts           # DB connection via @netlify/neon
migrations/          # Drizzle migrations (auto-generated)
netlify/functions/
  runs.mts           # GET/POST /api/runs
  run.mts            # GET/PATCH /api/runs/:id
  run-sessions.mts   # POST /api/runs/:id/sessions
  run-pr.mts         # POST /api/runs/:id/pull-request
  sites.mts          # GET /api/sites (cached)
  sync-trigger.mts   # POST /api/sync/trigger
  sync-worker-background.mts  # Background sync worker
src/
  api/               # Frontend API clients
  components/        # React components (kanban/, layout/, runs/, archive/, sync/)
  hooks/             # useRuns, useSites, useSyncStatus
  store/             # Zustand store (kanbanStore.ts)
  types/             # TypeScript types (runs.ts)
```

## Key Implementation Details

### Database Schema (Drizzle)
- **runs**: id, siteId, siteName, title, state, branch, pullRequestUrl, deployPreviewUrl, timestamps, customNotes
- **sessions**: id, runId, state, prompt, timestamps
- **sites**: id, name, updatedAt (cached from Netlify API)
- **syncState**: backoff tracking for sync worker

### Kanban Columns
| Column | State | Description |
|--------|-------|-------------|
| New | `NEW` | Freshly created runs |
| Running | `RUNNING` | Currently executing |
| Review | `DONE` (no PR) | Completed, needs review |
| PR Open | `DONE` (has PR) | PR created |
| Error | `ERROR` | Failed runs |

### Sync Strategy
- Triggered on app load and manual refresh
- Background worker syncs DB with Netlify API
- Exponential backoff: 30s → 1m → 2m → 5m → ... → 4 days max
- Backoff resets on state changes or manual refresh

### Environment Variables
- `NETLIFY_PAT` - Netlify Personal Access Token (required)
- `NETLIFY_DATABASE_URL` - Auto-provisioned by Netlify DB

## Development Commands

```bash
npm run dev          # Start dev server (with Netlify functions)
npm run build        # Build for production
npm run db:generate  # Generate Drizzle migration
npm run db:migrate   # Run migrations (via netlify dev:exec)
npm run db:studio    # Open Drizzle Studio
```

## Current Status (as of last session)

### Completed
- [x] Full kanban board UI with 5 columns
- [x] Create runs via Netlify API
- [x] Add follow-up sessions to runs
- [x] Create PRs from completed runs
- [x] Archive/restore runs
- [x] Background sync with exponential backoff
- [x] Manual refresh button
- [x] Drizzle ORM integration
- [x] Server-side logging for debugging

### Not Yet Implemented
- [ ] Diff viewer for run changes
- [ ] Filter/search runs by site or branch
- [ ] Custom notes on runs (schema exists, UI not built)
- [ ] GitHub integration for PR status/checks

## Netlify Primitives Reference

See `.agents/` directory for documentation:
- `netlify-agent-runners.md` - Agent Runners API endpoints
- `netlify-agent-runner-response-examples.md` - Real API response examples
- `netlify-db.md` - Database (using Drizzle ORM, not raw SQL)
- `netlify-serverless.md` - Functions patterns
- `netlify-blobs.md`, `netlify-env-variables.md`, etc.

## API Routes

All Netlify Functions must use clean `/api` routes via the `config.path` export. Never use `/.netlify/functions/` paths.

| Function | Route | Methods |
|----------|-------|---------|
| runs.mts | `/api/runs` | GET, POST |
| run.mts | `/api/runs/:id` | GET, PATCH |
| run-sessions.mts | `/api/runs/:id/sessions` | GET, POST |
| run-pr.mts | `/api/runs/:id/pull-request` | POST |
| sites.mts | `/api/sites` | GET |
| sync-trigger.mts | `/api/sync/trigger` | GET, POST |
| sync-worker-background.mts | `/api/sync/worker` | POST |

When functions call other functions internally, use `new URL(req.url).origin` to get the base URL.

## Notes

- All API responses use **camelCase** (matches Drizzle schema)
- Frontend types in `src/types/runs.ts` must match Drizzle schema
- Sync worker logs prefixed with `[sync-worker]`, trigger with `[sync-trigger]`
- Sites are cached for 5 minutes before re-fetching from Netlify API
- Netlify API returns lowercase state values - always normalize to UPPERCASE when storing
