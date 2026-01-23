-- Runs table (mirrors Agent Runners with custom fields)
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,                    -- Netlify agent runner ID
  site_id TEXT NOT NULL,
  site_name TEXT,
  title TEXT,
  state TEXT NOT NULL,                    -- NEW, RUNNING, DONE, ERROR, ARCHIVED
  branch TEXT,
  pull_request_url TEXT,
  deploy_preview_url TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  synced_at TIMESTAMP,                    -- Last sync with Netlify API
  archived_at TIMESTAMP,                  -- When manually archived in this app
  custom_notes TEXT                       -- User notes (app-specific)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  prompt TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Sync state table (for polling backoff)
CREATE TABLE IF NOT EXISTS sync_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_sync_at TIMESTAMP,
  next_sync_at TIMESTAMP,
  backoff_seconds INTEGER DEFAULT 30,
  consecutive_no_change INTEGER DEFAULT 0
);

-- Sites cache
CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_runs_state ON runs(state);
CREATE INDEX IF NOT EXISTS idx_runs_site_id ON runs(site_id);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_run_id ON sessions(run_id);

-- Initialize sync state with default row
INSERT INTO sync_state (id, backoff_seconds, consecutive_no_change)
VALUES (1, 30, 0)
ON CONFLICT (id) DO NOTHING;
