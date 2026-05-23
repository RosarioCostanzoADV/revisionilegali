import { gwJson } from "@/lib/api";
import { ProfiloForm } from "./ProfiloForm";
import type { MeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  tenant_owner: "Titolare",
  revisor:      "Revisore",
  collaborator: "Collaboratore",
  syndic:       "Sindaco",
};

export default async function ProfiloPage() {
  const me = await gwJson<MeResponse>("/api/auth/me");
  if (!me) return null;

  const profile = me.profile;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Il mio profilo</h1>
        <p className="mt-1 text-sm text-gray-500">
          {ROLE_LABELS[profile.role] ?? profile.role} · {profile.email}
        </p>
      </div>
      <ProfiloForm profile={{
        full_name: profile.full_name ?? null,
        phone: profile.phone ?? null,
        signature_text: profile.signature_text ?? null,
        role: profile.role,
      }} />
    </div>
  );
}
