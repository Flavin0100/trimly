import { and, eq, like, ne } from "drizzle-orm";
import { getDb } from "../../../db";
import { bookings, scheduleBlocks, services, shops, staff } from "../../../db/schema";

const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? "";
    const serviceId = Number(url.searchParams.get("serviceId"));
    const requestedStaffId = Number(url.searchParams.get("staffId")) || null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !serviceId) {
      return Response.json({ error: "Informe uma data e um serviço válidos" }, { status: 400 });
    }

    const db = getDb();
    const [service] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
    if (!service) return Response.json({ error: "Serviço não encontrado" }, { status: 404 });
    const [shop] = await db.select().from(shops).where(eq(shops.id, service.shopId)).limit(1);
    if (!shop) return Response.json({ error: "Barbearia não encontrada" }, { status: 404 });

    const dayIndex = new Date(`${date}T12:00:00Z`).getUTCDay();
    const openingHours = JSON.parse(shop.openingHours) as Record<string, { enabled: boolean; start: string; end: string }>;
    const hours = openingHours[dayKeys[dayIndex]];
    if (!hours?.enabled) return Response.json({ date, closed: true, slots: [] });

    const team = await db.select().from(staff).where(and(eq(staff.shopId, shop.id), eq(staff.active, true)));
    const teamPool = requestedStaffId ? team.filter(person => person.id === requestedStaffId) : team;
    const professionals = teamPool.length ? teamPool.map(person => ({ id: person.id, name: person.name })) : [{ id: 0, name: "Primeiro disponível" }];
    const existing = await db.select().from(bookings).where(and(eq(bookings.shopId, shop.id), like(bookings.appointmentAt, `${date}%`), ne(bookings.status, "cancelled")));
    const blockedIntervals = await db.select().from(scheduleBlocks).where(and(eq(scheduleBlocks.shopId, shop.id), like(scheduleBlocks.startsAt, `${date}%`)));

    const start = toMinutes(hours.start);
    const end = toMinutes(hours.end);
    const slots = [];
    for (let slotStart = start; slotStart + service.durationMinutes <= end; slotStart += 15) {
      const slotEnd = slotStart + service.durationMinutes;
      const freeProfessional = professionals.find(person => {
        const hasBooking = existing.some(booking => {
          if (person.id && booking.staffId !== person.id) return false;
          const bookedTime = booking.appointmentAt.includes("T") ? booking.appointmentAt.split("T")[1] : booking.appointmentAt.split(" ")[1];
          const bookingStart = toMinutes(bookedTime.slice(0, 5));
          const bookingEnd = bookingStart + (booking.durationMinutes || 30);
          return slotStart < bookingEnd && slotEnd > bookingStart;
        });
        const hasBlock = blockedIntervals.some(block => {
          if (block.staffId && person.id && block.staffId !== person.id) return false;
          const blockStart = toMinutes(block.startsAt.split("T")[1].slice(0, 5));
          const blockEnd = toMinutes(block.endsAt.split("T")[1].slice(0, 5));
          return slotStart < blockEnd && slotEnd > blockStart;
        });
        return !hasBooking && !hasBlock;
      });
      slots.push({ time: toTime(slotStart), available: Boolean(freeProfessional), staffId: freeProfessional?.id || null, staffName: freeProfessional?.name || null });
    }

    return Response.json({ date, closed: false, duration: service.durationMinutes, slots });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível calcular os horários";
    return Response.json({ error: message }, { status: 500 });
  }
}
