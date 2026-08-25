CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer,
	"service_id" integer,
	"staff_id" integer,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"service" text NOT NULL,
	"appointment_at" text NOT NULL,
	"price_cents" integer NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer NOT NULL,
	"staff_id" integer,
	"starts_at" text NOT NULL,
	"ends_at" text NOT NULL,
	"reason" text DEFAULT 'Horário bloqueado' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer NOT NULL,
	"name" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"plan" text DEFAULT 'solo' NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"opening_hours" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shops_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'Barbeiro' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
