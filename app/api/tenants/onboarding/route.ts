import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const OnboardingSchema = z.object({
  name: z.string().trim().min(1, "Nome studio obbligatorio").max(200),
  referent_name: z
    .string()
    .trim()
    .min(1, "Nome referente obbligatorio")
    .max(200),
  phone: z.string().trim().max(50).optional(),
  vat_number: z.string().trim().max(50).optional(),
  timezone: z.string().trim().max(100).optional(),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("tenant_id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!profile.tenant_id) {
    return NextResponse.json(
      { error: "Nessun tenant associato all'utente" },
      { status: 400 },
    );
  }

  if (profile.role !== "tenant_owner" && profile.role !== "super_admin") {
    return NextResponse.json(
      { error: "Solo il titolare dello studio può completare l'onboarding" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }

  const parsed = OnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dati non validi",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("tenants")
    .update({
      name: parsed.data.name,
      referent_name: parsed.data.referent_name,
      phone: parsed.data.phone ?? null,
      vat_number: parsed.data.vat_number ?? null,
      timezone: parsed.data.timezone ?? "Europe/Rome",
      onboarding_completed: true,
    })
    .eq("id", profile.tenant_id)
    .select("id, name, referent_name, phone, vat_number, timezone, onboarding_completed, status")
    .maybeSingle();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message ?? "Errore durante il salvataggio" },
      { status: 500 },
    );
  }

  return NextResponse.json({ tenant: updated });
}
