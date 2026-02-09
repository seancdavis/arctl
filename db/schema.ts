import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

export const runs = pgTable("runs", {
  id: text("id").primaryKey(),
  siteId: text("site_id").notNull(),
  siteName: text("site_name"),
  title: text("title"),
  state: text("state").notNull(), // NEW, RUNNING, DONE, ERROR, ARCHIVED
  branch: text("branch"),
  pullRequestUrl: text("pull_request_url"),
  pullRequestState: text("pull_request_state"),
  pullRequestBranch: text("pull_request_branch"),
  deployPreviewUrl: text("deploy_preview_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  prCommittedAt: timestamp("pr_committed_at", { withTimezone: true }),
  prNeedsUpdate: boolean("pr_needs_update").default(false).notNull(),
  prCheckStatus: text("pr_check_status"), // pending, success, failure
  customNotes: text("custom_notes"),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  state: text("state").notNull(),
  prompt: text("prompt"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const syncState = pgTable("sync_state", {
  id: integer("id").primaryKey().default(1),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  nextSyncAt: timestamp("next_sync_at", { withTimezone: true }),
  backoffSeconds: integer("backoff_seconds").default(30),
  consecutiveNoChange: integer("consecutive_no_change").default(0),
});

export const sites = pgTable("sites", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  syncEnabled: boolean("sync_enabled").default(false).notNull(),
});

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SyncState = typeof syncState.$inferSelect;
export type Site = typeof sites.$inferSelect;
