import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfiloForm } from "./ProfiloForm";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  tenant_owner: "Titolare",
  revisor:      "Revisore",
  collaborator: "Collaboratore",
  syndic:       "Sindaco",
};

export default async function ProfiloPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, phone, signature_text, role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.tenant_id) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Il mio profilo</h1>
        <p className="mt-1 text-sm text-gray-500">
          {ROLE_LABELS[profile.role] ?? profile.role} · {user.email}
        </p>
      </div>
      <ProfiloForm profile={profile} />
    </div>
  );
}
