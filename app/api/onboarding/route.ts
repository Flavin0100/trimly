import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { services, shopMembers, shops, staff } from "../../../db/schema";
import { getCurrentTenant, unauthorized } from "@/lib/auth/access";

type OnboardingPayload = {
  shop?: { name?: string; slug?: string; phone?: string; address?: string; plan?: string; timezone?: string };
  services?: Array<{ name?: string; duration?: number; price?: number; description?: string }>;
  staff?: Array<{ name?: string; role?: string; phone?: string }>;
  openingHours?: Record<string, { enabled?: boolean; start?: string; end?: string }>;
};

export async function GET() {
  try {
    const { user, shop } = await getCurrentTenant();
    if (!user) return unauthorized();
    if (!shop) return Response.json({ shop: null, services: [], staff: [] });

    const db = getDb();
    const [shopServices, shopStaff] = await Promise.all([
      db.select().from(services).where(eq(services.shopId, shop.id)),
      db.select().from(staff).where(eq(staff.shopId, shop.id)),
    ]);
    return Response.json({
      shop: { ...shop, openingHours: JSON.parse(shop.openingHours) },
      services: shopServices,
      staff: shopStaff,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar a configuração";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, shop: existingShop } = await getCurrentTenant();
    if (!user) return unauthorized();
    if (existingShop) return Response.json({ error: "Sua conta já possui uma barbearia configurada" }, { status: 409 });

    const payload = (await request.json()) as OnboardingPayload;
    const name = payload.shop?.name?.trim() ?? "";
    const slug = payload.shop?.slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "") ?? "";
    const phone = payload.shop?.phone?.trim() ?? "";
    const address = payload.shop?.address?.trim() ?? "";
    if (!name || !slug || !phone || !address) {
      return Response.json({ error: "Preencha os dados obrigatórios da barbearia" }, { status: 400 });
    }

    const db = getDb();
    const [shop] = await db.insert(shops).values({
      name,
      slug,
      phone,
      address,
      plan: payload.shop?.plan === "pro" ? "pro" : "solo",
      timezone: payload.shop?.timezone || "America/New_York",
      openingHours: JSON.stringify(payload.openingHours ?? {}),
    }).returning();

    await db.insert(shopMembers).values({ shopId: shop.id, userId: user.id, role: "owner" });

    for (const item of payload.services ?? []) {
      if (!item.name?.trim()) continue;
      await db.insert(services).values({
        shopId: shop.id,
        name: item.name.trim(),
        durationMinutes: Math.max(5, Number(item.duration) || 30),
        priceCents: Math.max(0, Math.round((Number(item.price) || 0) * 100)),
        description: item.description?.trim() ?? "",
      });
    }

    for (const person of payload.staff ?? []) {
      if (!person.name?.trim()) continue;
      await db.insert(staff).values({
        shopId: shop.id,
        name: person.name.trim(),
        role: person.role?.trim() || "Barbeiro",
        phone: person.phone?.trim() ?? "",
      });
    }

    return Response.json({ shop }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível concluir a configuração";
    const status = message.toLowerCase().includes("unique") || message.toLowerCase().includes("duplicate") ? 409 : 500;
    return Response.json({ error: status === 409 ? "Este link já está em uso" : message }, { status });
  }
}
