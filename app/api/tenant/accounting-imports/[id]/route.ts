import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireTenantUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, tenant_id, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_active || !profile.tenant_id) return null;
  return { supabase, profile, user };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabase } = ctx;

  const [{ data: imp }, { data: entries }] = await Promise.all([
    supabase
      .from("accounting_imports")
      .select("id, filename, period_label, row_count, notes, created_at, quarter_id")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("accounting_entries")
      .select("id, account_code, account_name, balance, balance_prev")
      .eq("import_id", id)
      .order("account_code", { nullsFirst: false })
      .order("account_name"),
  ]);

  if (!imp) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  return NextResponse.json({ ...imp, entries: entries ?? [] });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["tenant_owner", "revisor"].includes(ctx.profile.role)) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  const { supabase } = ctx;
  // Le entries vengono eliminate in cascade
  const { error } = await supabase.from("accounting_imports").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
