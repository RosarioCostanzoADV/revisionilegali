import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NuovaAziendaForm } from "./NuovaAziendaForm";

export const dynamic = "force-dynamic";

export default async function NuovaAziendaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.tenant_id) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/aziende" className="text-sm text-brand-600 hover:text-brand-700">
          ← Tutte le aziende
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Nuova azienda</h1>
      </div>
      <NuovaAziendaForm />
    </div>
  );
}
