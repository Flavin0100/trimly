import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/clients");
  return children;
}
