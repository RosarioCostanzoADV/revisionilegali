import { NextResponse } from "next/server";
import { z } from "zod";
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

export async function GET(request: Request) {
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const quarter_id = searchParams.get("quarter_id");
  if (!quarter_id) return NextResponse.json({ error: "quarter_id required" }, { status: 400 });

  const { supabase } = ctx;
  const { data, error } = await supabase
    .from("findings")
    .select("id, title, severity, status, raised_by, due_date, created_at, working_paper_id")
    .eq("quarter_id", quarter_id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

const createSchema = z.object({
  quarter_id: z.string().uuid(),
  working_paper_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(300),
  description: z.string().max(5000).nullable().optional(),
  recommendation: z.string().max(5000).nullable().optional(),
  severity: z.enum(["bassa", "media", "alta", "critica"]).default("media"),
  due_date: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { supabase, profile, user } = ctx;
  const { data, error } = await supabase
    .from("findings")
    .insert({
      ...parsed.data,
      tenant_id: profile.tenant_id,
      raised_by: user.id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
