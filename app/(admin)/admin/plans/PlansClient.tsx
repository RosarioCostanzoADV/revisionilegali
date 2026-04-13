"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

interface Plan {
  id: string;
  name: string;
  max_assignments: number;
  max_users: number;
  storage_gb: number;
  ai_quota: number | null;
  vigilance_module: boolean;
  ai_drafts_module: boolean;
  advanced_import: boolean;
  is_active: boolean;
}

function PlanForm({
  initial,
  onSave,
  onCancel,
  loading,
  error,
}: {
  initial?: Partial<Plan>;
  onSave: (data: Partial<Plan>) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    max_assignments: initial?.max_assignments ?? 10,
    max_users: initial?.max_users ?? 5,
    storage_gb: initial?.storage_gb ?? 10,
    ai_quota: initial?.ai_quota ?? null as number | null,
    vigilance_module: initial?.vigilance_module ?? false,
    ai_drafts_module: initial?.ai_drafts_module ?? false,
    advanced_import: initial?.advanced_import ?? false,
    is_active: initial?.is_active ?? true,
  });

  return (
    <div className="space-y-4 rounded-lg border border-brand-200 bg-brand-50/30 p-5">
      {error && <Alert variant="error">{error}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Nome piano *"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
        <Input
          label="Incarichi/anno *"
          type="number"
          min={1}
          value={form.max_assignments}
          onChange={(e) => setForm((f) => ({ ...f, max_assignments: Number(e.target.value) }))}
        />
        <Input
          label="Utenti max *"
          type="number"
          min={1}
          value={form.max_users}
          onChange={(e) => setForm((f) => ({ ...f, max_users: Number(e.target.value) }))}
        />
        <Input
          label="Storage (GB) *"
          type="number"
          min={1}
          value={form.storage_gb}
          onChange={(e) => setForm((f) => ({ ...f, storage_gb: Number(e.target.value) }))}
        />
        <Input
          label="Quota AI (chiamate/mese, vuoto = illimitata)"
          type="number"
          min={0}
          value={form.ai_quota ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, ai_quota: e.target.value ? Number(e.target.value) : null }))}
        />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-600">Moduli inclusi</p>
        {[
          { key: "vigilance_module", label: "Modulo vigilanza / collegio sindacale" },
          { key: "ai_drafts_module", label: "Generazione bozze con AI" },
          { key: "advanced_import", label: "Import contabile avanzato" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form[key as keyof typeof form] as boolean}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-brand-600"
            />
            {label}
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-brand-600"
          />
          Piano attivo (visibile per assegnazione)
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} loading={loading}>Annulla</Button>
        <Button onClick={() => onSave(form)} loading={loading}>Salva</Button>
      </div>
    </div>
  );
}

export function PlansClient({ initialPlans }: { initialPlans: Plan[] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function savePlan(id: string, data: Partial<Plan>) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(typeof d.error === "string" ? d.error : "Errore salvataggio.");
      return;
    }
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } as Plan : p)));
    setEditingId(null);
  }

  async function createPlan(data: Partial<Plan>) {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(typeof d.error === "string" ? d.error : "Errore creazione.");
      return;
    }
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      {/* Tabella piani */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Piano", "Incarichi/anno", "Utenti max", "Storage", "Quota AI", "Moduli", "Stato", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {plans.map((plan) => {
              const modules = [
                plan.vigilance_module && "Vigilanza",
                plan.ai_drafts_module && "Bozze AI",
                plan.advanced_import && "Import avanzato",
              ].filter(Boolean);

              return (
                <tr key={plan.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{plan.name}</td>
                  <td className="px-4 py-3 text-gray-700">{plan.max_assignments}</td>
                  <td className="px-4 py-3 text-gray-700">{plan.max_users}</td>
                  <td className="px-4 py-3 text-gray-700">{plan.storage_gb} GB</td>
                  <td className="px-4 py-3 text-gray-700">{plan.ai_quota ? `${plan.ai_quota}/mese` : "Illimitata"}</td>
                  <td className="px-4 py-3 text-gray-700">{modules.length > 0 ? modules.join(", ") : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${plan.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {plan.is_active ? "Attivo" : "Inattivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setEditingId(plan.id); setShowNew(false); setError(null); }}
                      className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                    >
                      Modifica
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Form modifica */}
      {editingId && (
        <PlanForm
          initial={plans.find((p) => p.id === editingId)}
          onSave={(data) => savePlan(editingId, data)}
          onCancel={() => { setEditingId(null); setError(null); }}
          loading={loading}
          error={error}
        />
      )}

      {/* Nuovo piano */}
      {!showNew && !editingId && (
        <Button variant="secondary" onClick={() => { setShowNew(true); setError(null); }}>
          + Nuovo piano
        </Button>
      )}

      {showNew && (
        <PlanForm
          onSave={createPlan}
          onCancel={() => { setShowNew(false); setError(null); }}
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
}
