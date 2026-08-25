import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { services, shops, staff } from "@/db/schema";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const slug = new URL(request.url).searchParams.get("slug")?.trim().toLowerCase();
    const [shop] = slug
      ? await db.select().from(shops).where(eq(shops.slug, slug)).limit(1)
      : await db.select().from(shops).orderBy(desc(shops.id)).limit(1);

    if (!shop) return Response.json({ error: "Barbearia não encontrada" }, { status: 404 });

    const [shopServices, shopStaff] = await Promise.all([
      db.select().from(services).where(eq(services.shopId, shop.id)),
      db.select().from(staff).where(eq(staff.shopId, shop.id)),
    ]);

    return Response.json({
      shop: { id: shop.id, name: shop.name, slug: shop.slug, address: shop.address, timezone: shop.timezone },
      services: shopServices.filter(item => item.active),
      staff: shopStaff.filter(person => person.active),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar a barbearia";
    return Response.json({ error: message }, { status: 500 });
  }
}
