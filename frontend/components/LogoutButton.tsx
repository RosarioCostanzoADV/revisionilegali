"use client";

import { useState } from "react";
import { clearAuthToken } from "@/lib/client-api";
import { Button } from "@/components/ui/Button";

export function LogoutButton({
  variant = "secondary",
}: {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    clearAuthToken();
    window.location.href = "/login";
  }

  return (
    <Button variant={variant} loading={loading} onClick={handleLogout}>
      Esci
    </Button>
  );
}
