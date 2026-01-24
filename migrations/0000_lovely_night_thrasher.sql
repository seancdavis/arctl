CREATE TABLE "runs" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"site_name" text,
	"title" text,
	"state" text NOT NULL,
	"branch" text,
	"pull_request_url" text,
	"deploy_preview_url" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"synced_at" timestamp,
	"archived_at" timestamp,
	"custom_notes" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"state" text NOT NULL,
	"prompt" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"updated_at" timestamp NOT NULL,
	"sync_enabled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_state" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"last_sync_at" timestamp,
	"next_sync_at" timestamp,
	"backoff_seconds" integer DEFAULT 30,
	"consecutive_no_change" integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;