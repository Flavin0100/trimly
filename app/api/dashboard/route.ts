import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { bookings, scheduleBlocks, staff } from "../../../db/schema";
import { getCurrentTenant, shopRequired, unauthorized } from "@/lib/auth/access";

const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function dateInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function dayIndex(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function moneyChange(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function GET() {
  try {
    const { user, shop } = await getCurrentTenant();
    if (!user) return unauthorized();
    if (!shop) return shopRequired();
    const db = getDb();

    const [allBookings, team, allBlocks] = await Promise.all([
      db.select().from(bookings).where(eq(bookings.shopId, shop.id)).orderBy(bookings.appointmentAt),
      db.select().from(staff).where(eq(staff.shopId, shop.id)),
      db.select().from(scheduleBlocks).where(eq(scheduleBlocks.shopId, shop.id)),
    ]);

    const today = dateInTimezone(shop.timezone);
    const activeBookings = allBookings.filter(item => item.status !== "cancelled");
    const todayBookings = activeBookings.filter(item => item.appointmentAt.startsWith(today));
    const yesterday = addDays(today, -1);
    const weekStart = addDays(today, -6);
    const previousWeekStart = addDays(today, -13);
    const previousWeekEnd = addDays(today, -7);
    const monthStart = `${today.slice(0, 8)}01`;
    const previousMonthEnd = addDays(monthStart, -1);
    const previousMonthStart = `${previousMonthEnd.slice(0, 8)}01`;

    const inRange = (start: string, end: string) => activeBookings.filter(item => {
      const date = item.appointmentAt.slice(0, 10);
      return date >= start && date <= end;
    });
    const revenue = (items: typeof activeBookings) => items.reduce((total, item) => total + item.priceCents, 0);

    const todayRevenue = revenue(todayBookings);
    const yesterdayRevenue = revenue(inRange(yesterday, yesterday));
    const weekBookings = inRange(weekStart, today);
    const previousWeekBookings = inRange(previousWeekStart, previousWeekEnd);
    const monthBookings = inRange(monthStart, today);
    const previousMonthBookings = inRange(previousMonthStart, previousMonthEnd);

    const customerFirstVisit = new Map<string, string>();
    for (const booking of activeBookings) {
      const current = customerFirstVisit.get(booking.phone);
      const date = booking.appointmentAt.slice(0, 10);
      if (!current || date < current) customerFirstVisit.set(booking.phone, date);
    }
    const uniqueToday = new Set(todayBookings.map(item => item.phone));
    const newToday = [...uniqueToday].filter(phone => customerFirstVisit.get(phone) === today).length;
    const returningToday = uniqueToday.size - newToday;
    const returnRate = uniqueToday.size ? Math.round((returningToday / uniqueToday.size) * 100) : 0;

    const openingHours = JSON.parse(shop.openingHours) as Record<string, { enabled?: boolean; start?: string; end?: string }>;
    const hours = openingHours[dayKeys[dayIndex(today)]];
    const activeTeam = team.filter(person => person.active);
    const teamCount = Math.max(1, activeTeam.length);
    const openMinutes = hours?.enabled && hours.start && hours.end ? Math.max(0, toMinutes(hours.end) - toMinutes(hours.start)) : 0;
    const blockedMinutes = allBlocks.filter(block => block.startsAt.startsWith(today)).reduce((total, block) => {
      const duration = Math.max(0, toMinutes(block.endsAt.split("T")[1].slice(0, 5)) - toMinutes(block.startsAt.split("T")[1].slice(0, 5)));
      return total + duration * (block.staffId ? 1 : teamCount);
    }, 0);
    const capacityMinutes = Math.max(0, openMinutes * teamCount - blockedMinutes);
    const bookedMinutes = todayBookings.reduce((total, item) => total + item.durationMinutes, 0);
    const occupancy = capacityMinutes ? Math.min(100, Math.round((bookedMinutes / capacityMinutes) * 100)) : 0;
    const availableSlots = Math.max(0, Math.floor((capacityMinutes - bookedMinutes) / 30));

    const staffNames = new Map(team.map(person => [person.id, person.name]));
    const appointments = todayBookings.slice(0, 6).map(item => ({
      id: item.id,
      time: item.appointmentAt.split("T")[1]?.slice(0, 5) ?? "--:--",
      name: item.name,
      initials: item.name.split(" ").filter(Boolean).map(part => part[0]).slice(0, 2).join("").toUpperCase(),
      service: item.service,
      staffName: item.staffId ? staffNames.get(item.staffId) ?? "Profissional" : "Primeiro disponível",
      priceCents: item.priceCents,
      status: item.status,
    }));

    const todaySeries = Array.from({ length: 6 }, (_, index) => {
      const startHour = 8 + index * 2;
      const endHour = startHour + 2;
      const items = todayBookings.filter(item => {
        const hour = Number(item.appointmentAt.split("T")[1]?.slice(0, 2));
        return hour >= startHour && hour < endHour;
      });
      return { label: `${startHour}h`, value: revenue(items) };
    });
    const weekSeries = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index);
      const label = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)).replace(".", "");
      return { label, value: revenue(inRange(date, date)) };
    });
    const monthSeries = Array.from({ length: 4 }, (_, index) => {
      const start = addDays(today, -(3 - index) * 7 - 6);
      const end = addDays(start, 6);
      return { label: `${start.slice(8)}–${end.slice(8)}`, value: revenue(inRange(start, end)) };
    });

    return Response.json({
      shop: { id: shop.id, name: shop.name, address: shop.address, timezone: shop.timezone },
      today,
      metrics: {
        revenueCents: todayRevenue,
        appointments: todayBookings.length,
        clients: uniqueToday.size,
        newClients: newToday,
        returnRate,
        availableSlots,
        occupancy,
        capacitySlots: Math.floor(capacityMinutes / 30),
      },
      revenue: {
        Hoje: { totalCents: todayRevenue, change: moneyChange(todayRevenue, yesterdayRevenue), series: todaySeries },
        Semana: { totalCents: revenue(weekBookings), change: moneyChange(revenue(weekBookings), revenue(previousWeekBookings)), series: weekSeries },
        Mês: { totalCents: revenue(monthBookings), change: moneyChange(revenue(monthBookings), revenue(previousMonthBookings)), series: monthSeries },
      },
      appointments,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar os indicadores";
    return Response.json({ error: message }, { status: 500 });
  }
}
