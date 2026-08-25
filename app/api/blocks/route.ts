import { and, eq, gte, like, lte, ne } from "drizzle-orm";
import { getDb } from "../../../db";
import { bookings, scheduleBlocks } from "../../../db/schema";
import { getCurrentTenant, shopRequired, unauthorized } from "@/lib/auth/access";

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function GET(request: Request) {
  try {
    const { user, shop } = await getCurrentTenant();
    if (!user) return unauthorized();
    if (!shop) return shopRequired();

    const url = new URL(request.url);
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");
    if (!start || !end) return Response.json({ blocks: [] });
    const rows = await getDb().select().from(scheduleBlocks).where(and(eq(scheduleBlocks.shopId, shop.id), gte(scheduleBlocks.startsAt, `${start}T00:00`), lte(scheduleBlocks.startsAt, `${end}T23:59`))).orderBy(scheduleBlocks.startsAt);
    return Response.json({ blocks: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar os bloqueios";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, shop } = await getCurrentTenant();
    if (!user) return unauthorized();
    if (!shop) return shopRequired();

    const payload = (await request.json()) as Record<string, unknown>;
    const shopId = shop.id;
    const staffId = Number(payload.staffId) || null;
    const startsAt = String(payload.startsAt ?? "");
    const endsAt = String(payload.endsAt ?? "");
    const reason = String(payload.reason ?? "Horário bloqueado").trim() || "Horário bloqueado";
    if (!shopId || !startsAt || !endsAt || startsAt >= endsAt) return Response.json({ error: "Informe um intervalo válido" }, { status: 400 });

    const date = startsAt.slice(0, 10);
    if (endsAt.slice(0, 10) !== date) return Response.json({ error: "O bloqueio deve começar e terminar no mesmo dia" }, { status: 400 });
    const startMinutes = toMinutes(startsAt.split("T")[1].slice(0, 5));
    const endMinutes = toMinutes(endsAt.split("T")[1].slice(0, 5));
    const db = getDb();
    const existing = await db.select().from(bookings).where(and(eq(bookings.shopId, shopId), like(bookings.appointmentAt, `${date}%`), ne(bookings.status, "cancelled")));
    const conflict = existing.some(booking => {
      if (staffId && booking.staffId !== staffId) return false;
      const bookingStart = toMinutes(booking.appointmentAt.split("T")[1].slice(0, 5));
      const bookingEnd = bookingStart + booking.durationMinutes;
      return startMinutes < bookingEnd && endMinutes > bookingStart;
    });
    if (conflict) return Response.json({ error: "Já existe um agendamento neste intervalo" }, { status: 409 });

    const [block] = await db.insert(scheduleBlocks).values({ shopId, staffId, startsAt, endsAt, reason }).returning();
    return Response.json({ block }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível bloquear o horário";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, shop } = await getCurrentTenant();
    if (!user) return unauthorized();
    if (!shop) return shopRequired();

    const payload = (await request.json()) as { id?: number };
    if (!payload.id) return Response.json({ error: "Bloqueio inválido" }, { status: 400 });
    await getDb().delete(scheduleBlocks).where(and(eq(scheduleBlocks.id, payload.id), eq(scheduleBlocks.shopId, shop.id)));
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível remover o bloqueio";
    return Response.json({ error: message }, { status: 500 });
  }
}
