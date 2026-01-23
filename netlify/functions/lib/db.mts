import { neon } from "@netlify/neon";

export const sql = neon();

export async function runMigrations() {
  // Create migrations tracking table
  await sql`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Check if initial migration has been applied
  const applied = await sql`SELECT name FROM migrations WHERE name = '001_initial_schema'`;

  if (applied.length === 0) {
    // Run the initial schema migration
    await sql`
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        site_name TEXT,
        title TEXT,
        state TEXT NOT NULL,
        branch TEXT,
        pull_request_url TEXT,
        deploy_preview_url TEXT,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        synced_at TIMESTAMP,
        archived_at TIMESTAMP,
        custom_notes TEXT
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        state TEXT NOT NULL,
        prompt TEXT,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS sync_state (
        id INTEGER PRIMARY KEY DEFAULT 1,
        last_sync_at TIMESTAMP,
        next_sync_at TIMESTAMP,
        backoff_seconds INTEGER DEFAULT 30,
        consecutive_no_change INTEGER DEFAULT 0
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_runs_state ON runs(state)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_runs_site_id ON runs(site_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_run_id ON sessions(run_id)`;

    await sql`
      INSERT INTO sync_state (id, backoff_seconds, consecutive_no_change)
      VALUES (1, 30, 0)
      ON CONFLICT (id) DO NOTHING
    `;

    // Record migration as applied
    await sql`INSERT INTO migrations (name) VALUES ('001_initial_schema')`;

    console.log("Applied migration: 001_initial_schema");
  }
}
