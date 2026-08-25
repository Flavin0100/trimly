CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"notes" text DEFAULT '' NOT NULL,
	"score" text DEFAULT 'green' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "clients_shop_phone_unique" ON "clients" USING btree ("shop_id","phone");--> statement-breakpoint
CREATE INDEX "clients_shop_idx" ON "clients" USING btree ("shop_id");