import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NuovoIncaricoForm } from "./NuovoIncaricoForm";

export const dynamic = "force-dynamic";

export default async function NuovoIncaricoPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.tenant_id) redirect("/dashboard");
  if (!["tenant_owner", "revisor"].includes(profile.role)) redirect("/incarichi");

  const [{ data: companies }, { data: users }] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name")
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("user_profiles")
      .select("id, full_name, role")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true)
      .order("full_name"),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/incarichi" className="text-sm text-brand-600 hover:text-brand-700">
          ← Tutti gli incarichi
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Nuovo incarico</h1>
      </div>
      <NuovoIncaricoForm
        companies={companies ?? []}
        users={users ?? []}
      />
    </div>
  );
}
