"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await authClient.signOut();
    window.location.href = "/login";
  }

  return <button type="button" disabled={loading} onClick={signOut}><i>↪</i>{loading ? "Saindo..." : "Sair da conta"}</button>;
}
