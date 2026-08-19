ALTER TABLE "participants" ADD COLUMN "voting_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE "participants" SET "voting_enabled" = false WHERE "role" IN ('facilitator', 'observer');--> statement-breakpoint
ALTER TABLE "queue_items" ADD COLUMN "grooming_outcome" text;--> statement-breakpoint
ALTER TABLE "queue_items" ADD COLUMN "grooming_note" text;--> statement-breakpoint
ALTER TABLE "queue_items" ADD COLUMN "decided_at" timestamp with time zone;
