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
    <div className="min-h-screen bg-slate-50">
      {/* Bordino colorato in cima */}
      <div className="h-1 bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400" />
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
                RL
              </span>
              <span className="text-sm font-semibold text-gray-800">Revisioni Legali</span>
            </Link>
            {tenant?.name && (
              <span className="hidden items-center gap-1 text-xs text-gray-400 sm:flex">
                <span className="text-gray-300">·</span>
                {tenant.name}
              </span>
            )}
          </div>
          <nav className="flex items-center gap-1 text-sm">
            {[
              { href: "/dashboard", label: "Dashboard" },
              { href: "/aziende",   label: "Aziende" },
              { href: "/incarichi", label: "Incarichi" },
              { href: "/settings",  label: "Impostazioni" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-md px-3 py-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
              >
                {label}
              </Link>
            ))}
            <span className="mx-1 h-4 w-px bg-gray-200" />
            <Link
              href="/profilo"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                {(profile?.full_name ?? user.email ?? "?")[0].toUpperCase()}
              </span>
              <span className="hidden sm:inline">{profile?.full_name ?? user.email}</span>
            </Link>
            <LogoutButton variant="ghost" />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
