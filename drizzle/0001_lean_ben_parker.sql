CREATE TABLE "shop_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "shop_members_shop_user_unique" ON "shop_members" USING btree ("shop_id","user_id");--> statement-breakpoint
CREATE INDEX "shop_members_user_idx" ON "shop_members" USING btree ("user_id");