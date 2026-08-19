CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"pointing_preset" text DEFAULT 'linear-team' NOT NULL,
	"custom_point_values" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"auto_reveal" boolean DEFAULT true NOT NULL,
	"cycle_scope" text DEFAULT 'upcoming' NOT NULL,
	"state_types" jsonb DEFAULT '["unstarted"]'::jsonb NOT NULL,
	"estimate_scope" text DEFAULT 'unestimated' NOT NULL,
	"assignee_scope" text DEFAULT 'anyone' NOT NULL,
	"default_sort" text DEFAULT 'linear' NOT NULL,
	"custom_sort_rules" jsonb DEFAULT '[{"field":"priority","direction":"asc"},{"field":"createdAt","direction":"asc"}]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "poker_sessions" ADD COLUMN "pointing_cards" jsonb DEFAULT '[{"value":0,"label":"0"},{"value":1,"label":"1"},{"value":2,"label":"2"},{"value":3,"label":"3"},{"value":4,"label":"4"}]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "poker_sessions" ADD COLUMN "auto_reveal" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "queue_items" ADD COLUMN "priority" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "queue_items" ADD COLUMN "linear_sort_order" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "queue_items" ADD COLUMN "linear_created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "queue_items" ADD COLUMN "linear_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "queue_items" ADD COLUMN "due_date" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;