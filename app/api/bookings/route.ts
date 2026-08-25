import { and, desc, eq, gte, like, lte, ne } from "drizzle-orm";
import { getDb } from "../../../db";
import { bookings, clients, scheduleBlocks, services, staff } from "../../../db/schema";
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

    const db = getDb();
    const url = new URL(request.url);
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");
    const rows = start && end
      ? await db.select().from(bookings).where(and(eq(bookings.shopId, shop.id), gte(bookings.appointmentAt, `${start}T00:00`), lte(bookings.appointmentAt, `${end}T23:59`))).orderBy(bookings.appointmentAt)
      : await db.select().from(bookings).where(eq(bookings.shopId, shop.id)).orderBy(desc(bookings.createdAt)).limit(20);
    const team = await db.select().from(staff).where(eq(staff.shopId, shop.id));
    const names = new Map(team.map(person => [person.id, person.name]));
    return Response.json({ bookings: rows.map(booking => ({ ...booking, staffName: booking.staffId ? names.get(booking.staffId) ?? "Profissional" : "Primeiro disponível" })) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar os agendamentos";
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
    if (!id) return Response.json({ error: "Agendamento inválido" }, { status: 400 });

    const db = getDb();
    const [current] = await db.select().from(bookings).where(and(eq(bookings.id, id), eq(bookings.shopId, shop.id))).limit(1);
    if (!current) return Response.json({ error: "Agendamento não encontrado" }, { status: 404 });

    if (payload.status === "cancelled") {
      const [booking] = await db.update(bookings).set({ status: "cancelled" }).where(and(eq(bookings.id, id), eq(bookings.shopId, shop.id))).returning();
      return Response.json({ booking });
    }

    const appointmentAt = String(payload.appointmentAt ?? current.appointmentAt);
    const staffId = payload.staffId === null || payload.staffId === "" ? null : Number(payload.staffId ?? current.staffId) || null;
    const date = appointmentAt.slice(0, 10);
    const time = appointmentAt.split("T")[1];
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(appointmentAt) || !time) {
      return Response.json({ error: "Informe uma nova data e horário válidos" }, { status: 400 });
    }
    const slotStart = toMinutes(time.slice(0, 5));
    const slotEnd = slotStart + current.durationMinutes;
    const existing = await db.select().from(bookings).where(and(eq(bookings.shopId, current.shopId!), like(bookings.appointmentAt, `${date}%`), ne(bookings.status, "cancelled"), ne(bookings.id, id)));
    const blockedIntervals = await db.select().from(scheduleBlocks).where(and(eq(scheduleBlocks.shopId, current.shopId!), like(scheduleBlocks.startsAt, `${date}%`)));
    const bookingConflict = existing.some(booking => {
      if (staffId && booking.staffId !== staffId) return false;
      const bookingTime = booking.appointmentAt.split("T")[1];
      const bookingStart = toMinutes(bookingTime.slice(0, 5));
      const bookingEnd = bookingStart + booking.durationMinutes;
      return slotStart < bookingEnd && slotEnd > bookingStart;
    });
    const blockConflict = blockedIntervals.some(block => {
      if (block.staffId && staffId && block.staffId !== staffId) return false;
      const blockStart = toMinutes(block.startsAt.split("T")[1].slice(0, 5));
      const blockEnd = toMinutes(block.endsAt.split("T")[1].slice(0, 5));
      return slotStart < blockEnd && slotEnd > blockStart;
    });
    if (bookingConflict || blockConflict) return Response.json({ error: "Este horário está ocupado ou bloqueado para o profissional selecionado" }, { status: 409 });

    const [booking] = await db.update(bookings).set({ appointmentAt, staffId, status: "confirmed" }).where(and(eq(bookings.id, id), eq(bookings.shopId, shop.id))).returning();
    return Response.json({ booking });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível atualizar o agendamento";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const name = String(payload.name ?? "").trim();
    const phone = String(payload.phone ?? "").trim();
    const appointmentAt = String(payload.appointmentAt ?? "").trim();
    const email = String(payload.email ?? "").trim();
    const serviceId = Number(payload.serviceId);
    const requestedStaffId = Number(payload.staffId) || null;
    const shopId = Number(payload.shopId);

    if (!name || !phone || !appointmentAt || !serviceId || !shopId) {
      return Response.json({ error: "Preencha os dados obrigatórios do agendamento" }, { status: 400 });
    }

    const db = getDb();
    const [service] = await db.select().from(services).where(and(eq(services.id, serviceId), eq(services.shopId, shopId))).limit(1);
    if (!service) return Response.json({ error: "Serviço não encontrado" }, { status: 404 });

    const date = appointmentAt.slice(0, 10);
    const time = appointmentAt.includes("T") ? appointmentAt.split("T")[1] : appointmentAt.split(" ")[1];
    const slotStart = toMinutes(time.slice(0, 5));
    const slotEnd = slotStart + service.durationMinutes;
    const team = await db.select().from(staff).where(and(eq(staff.shopId, shopId), eq(staff.active, true)));
    const candidates = requestedStaffId ? team.filter(person => person.id === requestedStaffId) : team;
    const professionals = candidates.length ? candidates : [{ id: 0, name: "Primeiro disponível", shopId, role: "Barbeiro", phone: "", active: true }];
    const existing = await db.select().from(bookings).where(and(eq(bookings.shopId, shopId), like(bookings.appointmentAt, `${date}%`), ne(bookings.status, "cancelled")));
    const blockedIntervals = await db.select().from(scheduleBlocks).where(and(eq(scheduleBlocks.shopId, shopId), like(scheduleBlocks.startsAt, `${date}%`)));

    const availableProfessional = professionals.find(person => {
      const bookingConflict = existing.some(booking => {
        if (person.id && booking.staffId !== person.id) return false;
        const bookedTime = booking.appointmentAt.includes("T") ? booking.appointmentAt.split("T")[1] : booking.appointmentAt.split(" ")[1];
        const bookingStart = toMinutes(bookedTime.slice(0, 5));
        const bookingEnd = bookingStart + (booking.durationMinutes || 30);
        return slotStart < bookingEnd && slotEnd > bookingStart;
      });
      const blockConflict = blockedIntervals.some(block => {
        if (block.staffId && person.id && block.staffId !== person.id) return false;
        const blockStart = toMinutes(block.startsAt.split("T")[1].slice(0, 5));
        const blockEnd = toMinutes(block.endsAt.split("T")[1].slice(0, 5));
        return slotStart < blockEnd && slotEnd > blockStart;
      });
      return !bookingConflict && !blockConflict;
    });

    if (!availableProfessional) {
      return Response.json({ error: "Este horário acabou de ser reservado. Escolha outro horário." }, { status: 409 });
    }

    const [booking] = await db.insert(bookings).values({
      shopId,
      serviceId,
      staffId: availableProfessional.id || null,
      name,
      phone,
      email: email || null,
      service: service.name,
      appointmentAt,
      priceCents: service.priceCents,
      durationMinutes: service.durationMinutes,
      status: "confirmed",
    }).returning();

    const [knownClient] = await db.select().from(clients).where(and(eq(clients.shopId, shopId), eq(clients.phone, phone))).limit(1);
    if (knownClient) {
      await db.update(clients).set({ name, email: email || knownClient.email, updatedAt: new Date().toISOString() }).where(eq(clients.id, knownClient.id));
    } else {
      await db.insert(clients).values({ shopId, name, phone, email: email || null });
    }
    return Response.json({ booking, staffName: availableProfessional.name }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível criar o agendamento";
    return Response.json({ error: message }, { status: 500 });
  }
}
