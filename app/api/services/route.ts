import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { bookings, services } from "../../../db/schema";
import { getCurrentTenant, shopRequired, unauthorized } from "@/lib/auth/access";

export async function GET() {
  try {
    const { user, shop } = await getCurrentTenant();
    if (!user) return unauthorized();
    if (!shop) return shopRequired();
    const db = getDb();
    const [items, appointments] = await Promise.all([
      db.select().from(services).where(eq(services.shopId, shop.id)).orderBy(services.name),
      db.select().from(bookings).where(eq(bookings.shopId, shop.id)),
    ]);
    const activeBookings = appointments.filter(item => item.status !== "cancelled");
    return Response.json({
      shop: { id: shop.id, name: shop.name, address: shop.address },
      services: items.map(service => {
        const related = activeBookings.filter(item => item.serviceId === service.id || (!item.serviceId && item.service === service.name));
        return {
          ...service,
          appointments: related.length,
          revenueCents: related.reduce((total, item) => total + item.priceCents, 0),
        };
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar os serviços";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, shop } = await getCurrentTenant();
    if (!user) return unauthorized();
    if (!shop) return shopRequired();
    const payload = (await request.json()) as Record<string, unknown>;
    const name = String(payload.name ?? "").trim();
    const durationMinutes = Math.max(5, Number(payload.durationMinutes) || 30);
    const priceCents = Math.max(0, Math.round(Number(payload.price) * 100));
    const description = String(payload.description ?? "").trim();
    if (!name || !Number.isFinite(priceCents)) return Response.json({ error: "Preencha nome, duração e preço" }, { status: 400 });
    const [service] = await getDb().insert(services).values({ shopId: shop.id, name, durationMinutes, priceCents, description }).returning();
    return Response.json({ service }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível criar o serviço";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, shop } = await getCurrentTenant();
    if (!user) return unauthorized();
    if (!shop) return shopRequired();
    const payload = (await request.json()) as Record<string, unknown>;
    const id = Number(payload.id);
    if (!id) return Response.json({ error: "Serviço inválido" }, { status: 400 });
    const updates: { name?: string; durationMinutes?: number; priceCents?: number; description?: string; active?: boolean } = {};
    if (payload.name !== undefined) updates.name = String(payload.name).trim();
    if (payload.durationMinutes !== undefined) updates.durationMinutes = Math.max(5, Number(payload.durationMinutes) || 30);
    if (payload.price !== undefined) updates.priceCents = Math.max(0, Math.round(Number(payload.price) * 100));
    if (payload.description !== undefined) updates.description = String(payload.description).trim();
    if (payload.active !== undefined) updates.active = Boolean(payload.active);
    const [service] = await getDb().update(services).set(updates).where(and(eq(services.id, id), eq(services.shopId, shop.id))).returning();
    if (!service) return Response.json({ error: "Serviço não encontrado" }, { status: 404 });
    return Response.json({ service });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível atualizar o serviço";
    return Response.json({ error: message }, { status: 500 });
  }
}
