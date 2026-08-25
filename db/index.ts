import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL não configurada. Conecte um banco Neon ao projeto na Vercel.");
  const sql = neon(databaseUrl);
  return drizzle({ client: sql, schema });
}
