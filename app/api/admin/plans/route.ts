import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.role === "super_admin" ? user : null;
}

const planSchema = z.object({
  name: z.string().min(1).max(100),
  max_assignments: z.number().int().min(1),
  max_users: z.number().int().min(1),
  storage_gb: z.number().int().min(1),
  ai_quota: z.number().int().min(0).nullable().optional(),
  vigilance_module: z.boolean().default(false),
  ai_drafts_module: z.boolean().default(false),
  advanced_import: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export async function POST(request: Request) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("plans")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
