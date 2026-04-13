import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
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
    .select("role, full_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "super_admin" || !profile.is_active) {
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
            <span className="text-slate-300">{profile.full_name ?? user.email}</span>
            <LogoutButton variant="ghost" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
