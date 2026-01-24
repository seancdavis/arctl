# Agent Runner Kanban

A kanban board for managing Netlify Agent Runs across all your sites. Built with Vite + React + TypeScript + Tailwind, using Netlify Functions and Netlify DB as the backend.

## Features

- **5-column kanban board**: New, Running, Review, PR Open, Error
- **Create runs**: Select a site, optional branch, and enter a prompt
- **Follow-up sessions**: Add additional prompts to existing runs
- **Create PRs**: Generate pull requests from completed runs
- **Archive management**: Archive completed runs and restore them later
- **Background sync**: Automatic sync with exponential backoff
- **Site picker**: Sites sorted by most recently used

## Architecture

```
┌─────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│  React Frontend │────▶│  App API          │────▶│  Netlify DB      │
│  (Kanban Board) │◀────│  (Functions)      │◀────│  (PostgreSQL)    │
└─────────────────┘     └───────────────────┘     └──────────────────┘
                                                          ▲
                                                          │ sync
                                                          ▼
                        ┌───────────────────┐     ┌──────────────────────┐
                        │  Sync Worker      │────▶│  Agent Runners API   │
                        │  (Background Fn)  │◀────│  api.netlify.com/v1  │
                        └───────────────────┘     └──────────────────────┘
```

## Setup

### Prerequisites

- Node.js 18+
- Netlify CLI (`npm install -g netlify-cli`)
- A Netlify account with Agent Runners enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/seancdavis/agent-runner-kanban.git
cd agent-runner-kanban

# Install dependencies
npm install

# Link to your Netlify site
netlify link
# Or create a new site
netlify init
```

### Environment Variables

Set the following environment variable in your Netlify site:

| Variable | Description |
|----------|-------------|
| `NETLIFY_PAT` | Your Netlify Personal Access Token |

You can set it via the Netlify CLI:

```bash
netlify env:set NETLIFY_PAT your-token-here
```

The database URL (`NETLIFY_DATABASE_URL`) is automatically provisioned by Netlify DB.

### Development

```bash
npm run dev
```

This starts the Vite dev server with Netlify Functions emulation. The database is auto-provisioned on first run.

### Build

```bash
npm run build
```

### Deploy

```bash
netlify deploy --prod
```

Or connect your GitHub repo for automatic deploys.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/runs` | GET | List all active runs |
| `/api/runs?archived=true` | GET | List archived runs |
| `/api/runs` | POST | Create a new run |
| `/api/runs/:id` | GET | Get a single run with sessions |
| `/api/runs/:id` | PATCH | Update run (archive, notes) |
| `/api/runs/:id/sessions` | POST | Add a follow-up session |
| `/api/runs/:id/pull-request` | POST | Create a PR for a run |
| `/api/sites` | GET | List all sites (cached) |
| `/api/sync/trigger` | POST | Trigger a sync (reset backoff with `?reset=true`) |

## Kanban Columns

| Column | State | Description |
|--------|-------|-------------|
| New | `NEW` | Freshly created runs |
| Running | `RUNNING` | Currently executing |
| Review | `DONE` (no PR) | Completed, needs review |
| PR Open | `DONE` (has PR) | PR created, awaiting merge |
| Error | `ERROR` | Failed runs |

## Sync Strategy

The app uses on-demand sync with exponential backoff:

- Sync triggers on app load and after user actions
- Backoff starts at 30 seconds and increases up to 4 days
- Backoff resets when:
  - User creates a new run
  - User adds a follow-up session
  - User manually refreshes
  - Any run state changes
- Sync stops when no active runs exist

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Zustand
- **Backend**: Netlify Functions, Netlify DB (Neon PostgreSQL)
- **Build**: Vite with @netlify/vite-plugin
