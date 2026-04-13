import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function TenantLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const { data: tenant } = profile?.tenant_id
    ? await supabase
        .from("tenants")
        .select("name")
        .eq("id", profile.tenant_id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-base font-semibold text-gray-900">
              Revisioni Legali
            </Link>
            {tenant?.name && (
              <span className="hidden text-sm text-gray-400 sm:inline">· {tenant.name}</span>
            )}
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-900">
              Dashboard
            </Link>
            <Link href="/aziende" className="text-gray-500 hover:text-gray-900">
              Aziende
            </Link>
            <Link href="/settings" className="text-gray-500 hover:text-gray-900">
              Impostazioni
            </Link>
            <span className="text-gray-600">{profile?.full_name ?? user.email}</span>
            <LogoutButton variant="ghost" />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
