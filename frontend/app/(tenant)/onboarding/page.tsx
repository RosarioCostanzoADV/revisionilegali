import { redirect } from "next/navigation";
import { gwJson } from "@/lib/api";
import { OnboardingForm } from "./OnboardingForm";
import type { MeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const me = await gwJson<MeResponse>("/api/auth/me");
  if (!me) redirect("/login");

  const tenant = me!.tenant;
  if (!tenant) redirect("/login");
  if (tenant.onboarding_completed) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configura il tuo studio</h1>
        <p className="mt-1 text-sm text-gray-600">Completa questi dati per iniziare a usare Revisioni Legali.</p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <OnboardingForm
          initial={{
            name: tenant.name ?? "",
            referent_name: tenant.referent_name ?? "",
            phone: tenant.phone ?? "",
            vat_number: tenant.vat_number ?? "",
            timezone: tenant.timezone ?? "Europe/Rome",
          }}
        />
      </div>
    </div>
  );
}
