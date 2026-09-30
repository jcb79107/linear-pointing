CREATE TABLE "team_defaults" (
	"organization_id" text NOT NULL,
	"team_id" text NOT NULL,
	"settings" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_defaults_organization_id_team_id_pk" PRIMARY KEY("organization_id","team_id")
);
--> statement-breakpoint
ALTER TABLE "poker_sessions" ADD COLUMN "intake" jsonb;--> statement-breakpoint
ALTER TABLE "poker_sessions" ADD COLUMN "defaults" jsonb;