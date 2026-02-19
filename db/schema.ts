import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  netlifyUserId: text("netlify_user_id").unique().notNull(),
  email: text("email"),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  accessToken: text("access_token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

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
  userId: uuid("user_id").references(() => users.id),
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

export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  userId: uuid("user_id").references(() => users.id),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").unique().notNull(),
  keyPrefix: text("key_prefix").notNull(),
  name: text("name").notNull(),
  siteId: text("site_id").notNull(),
  siteName: text("site_name"),
  scopes: jsonb("scopes").$type<string[]>().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isRevoked: boolean("is_revoked").default(false).notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  apiKeyId: uuid("api_key_id").references(() => apiKeys.id),
  userId: uuid("user_id").references(() => users.id),
  action: text("action").notNull(),
  siteId: text("site_id"),
  netlifyEndpoint: text("netlify_endpoint"),
  statusCode: integer("status_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type SyncState = typeof syncState.$inferSelect;
export type Site = typeof sites.$inferSelect;
