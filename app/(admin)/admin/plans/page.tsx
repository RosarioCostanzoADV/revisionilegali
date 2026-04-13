import { createAdminClient } from "@/lib/supabase/admin";
import { PlansClient } from "./PlansClient";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const admin = createAdminClient();

  const { data: plans } = await admin
    .from("plans")
    .select("*")
    .order("max_assignments", { ascending: true });

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
