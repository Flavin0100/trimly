import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { shopMembers, shops } from "@/db/schema";
import { auth } from "@/lib/auth/server";

export async function getCurrentUser() {
  const { data: session } = await auth.getSession();
  return session?.user ?? null;
}

export async function getOwnedShop(userId: string) {
  const db = getDb();
  const [membership] = await db.select().from(shopMembers).where(eq(shopMembers.userId, userId)).limit(1);
  if (!membership) return null;

  const [shop] = await db.select().from(shops).where(eq(shops.id, membership.shopId)).limit(1);
  return shop ?? null;
}

export async function getCurrentTenant() {
  const user = await getCurrentUser();
  if (!user) return { user: null, shop: null };
  return { user, shop: await getOwnedShop(user.id) };
}

export function unauthorized() {
  return Response.json({ error: "Faça login para continuar" }, { status: 401 });
}

export function shopRequired() {
  return Response.json({ error: "Configure sua barbearia para continuar" }, { status: 403 });
}
