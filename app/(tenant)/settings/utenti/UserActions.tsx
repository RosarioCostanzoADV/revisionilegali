"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

const ROLE_LABELS: Record<string, string> = {
  revisor: "Revisore",
  collaborator: "Collaboratore",
  syndic: "Sindaco",
};

interface User {
  id: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
}

export function UserActions({ user, onDone }: { user: User; onDone: () => void }) {
  const [loading, setLoading] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setLoading(true);
    await fetch(`/api/tenant/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    onDone();
  }

  if (user.role === "tenant_owner") return <span className="text-xs text-gray-400">Titolare</span>;

  return (
    <div className="flex items-center gap-2">
      <select
        defaultValue={user.role}
        disabled={loading}
        onChange={(e) => patch({ role: e.target.value })}
        className="h-8 rounded border border-gray-300 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <Button
        size="sm"
        variant={user.is_active ? "secondary" : "primary"}
        loading={loading}
        onClick={() => patch({ is_active: !user.is_active })}
      >
        {user.is_active ? "Disattiva" : "Riattiva"}
      </Button>
    </div>
  );
}
