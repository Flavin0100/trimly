import { redirect } from "next/navigation";

export default async function PublicShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/book?shop=${encodeURIComponent(slug)}`);
}
