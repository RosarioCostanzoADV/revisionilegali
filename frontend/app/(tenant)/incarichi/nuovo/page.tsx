import Link from "next/link";
import { gwJson } from "@/lib/api";
import { NuovoIncaricoForm } from "./NuovoIncaricoForm";
import type { MeResponse } from "@/lib/types";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NuovoIncaricoPage() {
  const [me, companies, users] = await Promise.all([
    gwJson<MeResponse>("/api/auth/me"),
    gwJson<{ id: string; name: string }[]>("/api/companies?archived=false"),
    gwJson<{ id: string; full_name: string; role: string }[]>("/api/auth/users"),
  ]);

  if (!me || !["tenant_owner", "revisor"].includes(me.profile.role)) {
    redirect("/incarichi");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/incarichi" className="text-sm text-brand-600 hover:text-brand-700">← Tutti gli incarichi</Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Nuovo incarico</h1>
      </div>
      <NuovoIncaricoForm companies={companies ?? []} users={users ?? []} />
    </div>
  );
}
