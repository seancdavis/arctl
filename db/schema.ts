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
  deployPreviewUrl: text("deploy_preview_url"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  syncedAt: timestamp("synced_at"),
  archivedAt: timestamp("archived_at"),
  customNotes: text("custom_notes"),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  state: text("state").notNull(),
  prompt: text("prompt"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const syncState = pgTable("sync_state", {
  id: integer("id").primaryKey().default(1),
  lastSyncAt: timestamp("last_sync_at"),
  nextSyncAt: timestamp("next_sync_at"),
  backoffSeconds: integer("backoff_seconds").default(30),
  consecutiveNoChange: integer("consecutive_no_change").default(0),
});

export const sites = pgTable("sites", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  syncEnabled: boolean("sync_enabled").default(false).notNull(),
});

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SyncState = typeof syncState.$inferSelect;
export type Site = typeof sites.$inferSelect;
