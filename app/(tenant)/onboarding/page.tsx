import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./OnboardingForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.tenant_id) redirect("/login");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, referent_name, phone, vat_number, timezone, onboarding_completed")
    .eq("id", profile.tenant_id)
    .maybeSingle();

  if (!tenant) redirect("/login");
  if (tenant.onboarding_completed) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Configura il tuo studio
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Completa questi dati per iniziare a usare Revisioni Legali.
        </p>
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
