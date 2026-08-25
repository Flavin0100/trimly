import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { bookings, clients } from "../../../db/schema";
import { getCurrentTenant, shopRequired, unauthorized } from "@/lib/auth/access";

type ClientScore = "green" | "yellow" | "red";

export async function GET() {
  try {
    const { user, shop } = await getCurrentTenant();
    if (!user) return unauthorized();
    if (!shop) return shopRequired();
    const db = getDb();

    const [appointments, profiles] = await Promise.all([
      db.select().from(bookings).where(eq(bookings.shopId, shop.id)).orderBy(desc(bookings.appointmentAt)),
      db.select().from(clients).where(eq(clients.shopId, shop.id)),
    ]);
    const profileByPhone = new Map(profiles.map(profile => [profile.phone, profile]));
    const grouped = new Map<string, {
      name: string;
      phone: string;
      email: string;
      visits: number;
      cancellations: number;
      totalSpentCents: number;
      lastVisit: string;
      services: Map<string, number>;
      history: Array<{ id: number; date: string; service: string; priceCents: number; status: string }>;
    }>();

    for (const appointment of appointments) {
      const client = grouped.get(appointment.phone) ?? {
        name: appointment.name,
        phone: appointment.phone,
        email: appointment.email ?? "",
        visits: 0,
        cancellations: 0,
        totalSpentCents: 0,
        lastVisit: "",
        services: new Map<string, number>(),
        history: [],
      };
      client.name = appointment.name || client.name;
      client.email = appointment.email || client.email;
      client.history.push({ id: appointment.id, date: appointment.appointmentAt, service: appointment.service, priceCents: appointment.priceCents, status: appointment.status });
      if (appointment.status === "cancelled") {
        client.cancellations += 1;
      } else {
        client.visits += 1;
        client.totalSpentCents += appointment.priceCents;
        if (!client.lastVisit || appointment.appointmentAt > client.lastVisit) client.lastVisit = appointment.appointmentAt;
        client.services.set(appointment.service, (client.services.get(appointment.service) ?? 0) + 1);
      }
      grouped.set(appointment.phone, client);
    }

    const result = [...grouped.values()].map(client => {
      const profile = profileByPhone.get(client.phone);
      const totalAppointments = client.visits + client.cancellations;
      const cancellationRate = totalAppointments ? client.cancellations / totalAppointments : 0;
      const automaticScore: ClientScore = cancellationRate >= 0.5 && totalAppointments >= 2 ? "red" : cancellationRate > 0 ? "yellow" : "green";
      const favoriteService = [...client.services.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
      return {
        id: profile?.id ?? null,
        name: profile?.name ?? client.name,
        phone: client.phone,
        email: profile?.email ?? client.email,
        notes: profile?.notes ?? "",
        score: (profile?.score as ClientScore | undefined) ?? automaticScore,
        visits: client.visits,
        cancellations: client.cancellations,
        totalSpentCents: client.totalSpentCents,
        averageTicketCents: client.visits ? Math.round(client.totalSpentCents / client.visits) : 0,
        lastVisit: client.lastVisit,
        favoriteService,
        history: client.history.slice(0, 12),
      };
    }).sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));

    return Response.json({ shop: { id: shop.id, name: shop.name, address: shop.address }, clients: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar os clientes";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, shop } = await getCurrentTenant();
    if (!user) return unauthorized();
    if (!shop) return shopRequired();
    const payload = (await request.json()) as Record<string, unknown>;
    const phone = String(payload.phone ?? "").trim();
    const name = String(payload.name ?? "").trim();
    const email = String(payload.email ?? "").trim();
    const notes = String(payload.notes ?? "").trim();
    const score = ["green", "yellow", "red"].includes(String(payload.score)) ? String(payload.score) : "green";
    if (!phone || !name) return Response.json({ error: "Cliente inválido" }, { status: 400 });

    const db = getDb();
    const [existing] = await db.select().from(clients).where(and(eq(clients.shopId, shop.id), eq(clients.phone, phone))).limit(1);
    const values = { name, email: email || null, notes, score, updatedAt: new Date().toISOString() };
    const [client] = existing
      ? await db.update(clients).set(values).where(eq(clients.id, existing.id)).returning()
      : await db.insert(clients).values({ shopId: shop.id, phone, ...values }).returning();
    return Response.json({ client });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível salvar o cliente";
    return Response.json({ error: message }, { status: 500 });
  }
}
