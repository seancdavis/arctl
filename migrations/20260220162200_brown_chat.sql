ALTER TABLE "runs" ADD COLUMN "merged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "result" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "duration" integer;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "done_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "mode" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "has_result_diff" boolean DEFAULT false;