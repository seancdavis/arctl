DELETE FROM "sites" WHERE "sync_enabled" = false;--> statement-breakpoint
ALTER TABLE "sites" DROP COLUMN "sync_enabled";