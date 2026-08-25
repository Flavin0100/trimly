import { boolean, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id"),
  serviceId: integer("service_id"),
  staffId: integer("staff_id"),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  service: text("service").notNull(),
  appointmentAt: text("appointment_at").notNull(),
  priceCents: integer("price_cents").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  status: text("status").notNull().default("confirmed"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  plan: text("plan").notNull().default("solo"),
  timezone: text("timezone").notNull().default("America/New_York"),
  openingHours: text("opening_hours").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const shopMembers = pgTable("shop_members", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("owner"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, table => [
  uniqueIndex("shop_members_shop_user_unique").on(table.shopId, table.userId),
  index("shop_members_user_idx").on(table.userId),
]);

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  name: text("name").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  priceCents: integer("price_cents").notNull(),
  description: text("description").notNull().default(""),
  active: boolean("active").notNull().default(true),
});

export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("Barbeiro"),
  phone: text("phone").notNull().default(""),
  active: boolean("active").notNull().default(true),
});

export const scheduleBlocks = pgTable("schedule_blocks", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  staffId: integer("staff_id"),
  startsAt: text("starts_at").notNull(),
  endsAt: text("ends_at").notNull(),
  reason: text("reason").notNull().default("Horário bloqueado"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});


export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  notes: text("notes").notNull().default(""),
  score: text("score").notNull().default("green"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, table => [
  uniqueIndex("clients_shop_phone_unique").on(table.shopId, table.phone),
  index("clients_shop_idx").on(table.shopId),
]);

