import { gwJson } from "@/lib/api";
import { PlansClient } from "./PlansClient";
import type { Plan } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const plans = await gwJson<Plan[]>("/api/plans");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Piani</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestisci i piani disponibili per gli studi clienti.
        </p>
      </div>

      <PlansClient initialPlans={plans ?? []} />
    </div>
  );
}
