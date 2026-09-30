CREATE TABLE "slack_connections" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"connection_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"encrypted_webhook_url" text NOT NULL,
	"workspace_name" text NOT NULL,
	"channel_name" text NOT NULL,
	"source" text NOT NULL,
	"last_sent_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "slack_connections" ADD CONSTRAINT "slack_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "cycle_scope" SET DEFAULT 'any';
