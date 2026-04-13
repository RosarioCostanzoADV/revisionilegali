"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function LogoutButton({
  variant = "secondary",
}: {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <Button variant={variant} loading={loading} onClick={handleLogout}>
      Esci
    </Button>
  );
}
