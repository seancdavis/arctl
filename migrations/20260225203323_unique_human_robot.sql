DELETE FROM "sites" WHERE "sync_enabled" = false;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "user_id" uuid;--> statement-breakpoint
UPDATE "sites" SET "user_id" = 'c7beeff9-95ef-4094-b03f-ff26f3217cd0';--> statement-breakpoint
ALTER TABLE "sites" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sites" DROP CONSTRAINT "sites_pkey";--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_id_user_id_pk" PRIMARY KEY("id","user_id");--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" DROP COLUMN "sync_enabled";