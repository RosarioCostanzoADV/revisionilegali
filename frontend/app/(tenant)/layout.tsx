import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { gwJson } from "@/lib/api";
import { LogoutButton } from "@/components/LogoutButton";
import { NavLinks } from "@/components/NavLinks";
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

  const initials =
    profile.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/95 backdrop-blur-md shadow-[0_1px_4px_0_rgb(0_0_0/0.06)]">
        <div className="h-0.5 bg-gradient-to-r from-brand-700 via-brand-500 to-brand-400" />
        <div className="mx-auto flex h-13 max-w-6xl items-center justify-between gap-4 px-4 py-2.5">

          {/* Logo */}
          <Link href="/dashboard" className="flex shrink-0 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Revisio" className="h-8 w-auto object-contain" />
          </Link>

          {/* Nav centrale */}
          <NavLinks />

          {/* Studio + avatar + logout */}
          <div className="flex shrink-0 items-center gap-1">
            {tenant?.name && (
              <span className="hidden max-w-[180px] truncate text-xs font-medium text-gray-500 sm:block mr-2">
                {tenant.name}
              </span>
            )}
            <Link
              href="/profilo"
              title={profile.full_name ?? "Profilo"}
              className="flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                {initials}
              </span>
            </Link>
            <LogoutButton variant="ghost" />
          </div>

        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
