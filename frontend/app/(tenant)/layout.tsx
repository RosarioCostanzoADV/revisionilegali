import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { gwJson } from "@/lib/api";
import { LogoutButton } from "@/components/LogoutButton";
import type { MeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TenantLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  if (!cookieStore.get("auth_token")?.value) redirect("/login");

  const me = await gwJson<MeResponse>("/api/auth/me");
  if (!me || !me.profile.is_active) redirect("/login");

  const profile = me.profile;
  const tenant = me.tenant;

  return (
    <div className="min-h-screen bg-slate-50">
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
                className="rounded-md px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/profilo" className="hover:text-gray-900">
              {profile.full_name ?? "Profilo"}
            </Link>
            <LogoutButton variant="ghost" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
