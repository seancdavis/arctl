ALTER TABLE "runs" ADD COLUMN "pr_committed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "pr_needs_update" boolean DEFAULT false NOT NULL;