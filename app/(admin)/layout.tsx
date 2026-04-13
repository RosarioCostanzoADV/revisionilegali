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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-900 bg-gray-900 text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-base font-semibold">
              Super Admin
            </Link>
            <nav className="flex gap-3 text-sm text-gray-300">
              <Link href="/admin" className="hover:text-white">
                Overview
              </Link>
              <Link href="/admin/tenants" className="hover:text-white">
                Tenant
              </Link>
              <Link href="/admin/plans" className="hover:text-white">
                Piani
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-300">
              {profile.full_name ?? user.email}
            </span>
            <LogoutButton variant="ghost" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
