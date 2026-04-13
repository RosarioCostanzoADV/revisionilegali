"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import type { Plan, TenantStatus } from "@/lib/supabase/types";

interface Props {
  tenantId: string;
  currentStatus: TenantStatus;
  currentPlanId: string | null;
  plans: Plan[];
}

export function TenantActions({ tenantId, currentStatus, currentPlanId, plans }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/admin/tenants/${tenantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Errore aggiornamento");
      return;
    }
    setSuccess("Aggiornato correttamente.");
    router.refresh();
  }

  const isSuspended = currentStatus === "suspended";

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Stato */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Stato account</h3>
        <div className="flex gap-2">
          {isSuspended ? (
            <Button
              size="sm"
              variant="primary"
              loading={loading}
              onClick={() => patch({ status: "active" })}
            >
              Riattiva tenant
            </Button>
          ) : (
            <Button
              size="sm"
              variant="danger"
              loading={loading}
              onClick={() => patch({ status: "suspended" })}
            >
              Sospendi tenant
            </Button>
          )}
          {currentStatus !== "trial" && (
            <Button
              size="sm"
              variant="secondary"
              loading={loading}
              onClick={() => patch({ status: "trial" })}
            >
              Imposta trial
            </Button>
          )}
        </div>
      </div>

      {/* Piano */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Piano licenza</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-gray-500">Cambia piano</label>
            <select
              id="plan-select"
              defaultValue={currentPlanId ?? ""}
              className="h-9 w-full rounded-md border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">— Nessun piano —</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            variant="secondary"
            loading={loading}
            onClick={() => {
              const sel = document.getElementById("plan-select") as HTMLSelectElement;
              patch({ plan_id: sel.value || null });
            }}
          >
            Salva piano
          </Button>
        </div>
      </div>
    </div>
  );
}
