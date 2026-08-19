CREATE TABLE "round_signals" (
	"round_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "round_signals_round_id_user_id_pk" PRIMARY KEY("round_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "poker_sessions" ADD COLUMN "active_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "poker_sessions" ADD COLUMN "elapsed_seconds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "queue_items" ADD COLUMN "active_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "queue_items" ADD COLUMN "elapsed_seconds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "poker_sessions" SET "active_started_at" = COALESCE("started_at", "updated_at") WHERE "status" = 'live';--> statement-breakpoint
UPDATE "queue_items" SET "active_started_at" = "updated_at" WHERE "status" = 'active';--> statement-breakpoint
ALTER TABLE "round_signals" ADD CONSTRAINT "round_signals_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_signals" ADD CONSTRAINT "round_signals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
