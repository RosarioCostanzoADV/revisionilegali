import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { gwJson } from "@/lib/api";
import { LogoutButton } from "@/components/LogoutButton";
import type { MeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  if (!cookieStore.get("auth_token")?.value) redirect("/login");

  const me = await gwJson<MeResponse>("/api/auth/me");
  if (!me || me.profile.role !== "super_admin" || !me.profile.is_active) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="h-1 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600" />
      <header className="border-b border-slate-700 bg-slate-800 text-white shadow-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-xs font-bold text-white">
                SA
              </span>
              <span className="text-sm font-semibold text-white">Super Admin</span>
            </Link>
            <span className="h-4 w-px bg-slate-600" />
            <nav className="flex gap-1 text-sm">
              {[
                { href: "/admin",         label: "Panoramica" },
                { href: "/admin/tenants", label: "Studi" },
                { href: "/admin/plans",   label: "Piani" },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-md px-3 py-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-300">{me.profile.full_name}</span>
            <LogoutButton variant="ghost" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
