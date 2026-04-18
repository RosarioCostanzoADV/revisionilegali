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
    .select("role, tenant_id, is_active, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_active || !profile.tenant_id) return null;
  return { supabase, profile, user };
}

// Template standard checklist di vigilanza trimestrale
const TEMPLATE_ITEMS: { item: string; category: string; sort_order: number }[] = [
  // Contabilità e amministrazione
  { item: "Verifica tenuta della contabilità sociale", category: "contabilità", sort_order: 1 },
  { item: "Verifica corretta applicazione dei principi contabili", category: "contabilità", sort_order: 2 },
  { item: "Verifica regolarità dei libri contabili obbligatori", category: "contabilità", sort_order: 3 },
  // Amministrazione e governance
  { item: "Verifica rispetto dei principi di corretta amministrazione", category: "governance", sort_order: 10 },
  { item: "Verifica adeguatezza assetto organizzativo, amministrativo e contabile", category: "governance", sort_order: 11 },
  { item: "Verifica rispetto della legge e dell'atto costitutivo", category: "governance", sort_order: 12 },
  { item: "Verifica verbali riunioni organo amministrativo (se disponibili)", category: "governance", sort_order: 13 },
  { item: "Verifica operazioni di rilievo e operazioni straordinarie", category: "governance", sort_order: 14 },
  { item: "Verifica rapporti con parti correlate", category: "governance", sort_order: 15 },
  // Adempimenti
  { item: "Verifica assolvimento obblighi tributari (IVA, F24, dichiarazioni)", category: "adempimenti", sort_order: 20 },
  { item: "Verifica adempimenti previdenziali e contributivi", category: "adempimenti", sort_order: 21 },
  { item: "Verifica scadenze deposito atti e bilancio (se applicabile)", category: "adempimenti", sort_order: 22 },
  // Controllo interno
  { item: "Verifica adeguatezza del sistema di controllo interno", category: "controllo_interno", sort_order: 30 },
  { item: "Verifica procedure antiriciclaggio (se applicabile)", category: "controllo_interno", sort_order: 31 },
];

export async function GET(request: Request) {
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const quarter_id = searchParams.get("quarter_id");
  if (!quarter_id) return NextResponse.json({ error: "quarter_id required" }, { status: 400 });

  const { supabase } = ctx;
  const { data, error } = await supabase
    .from("vigilanza_items")
    .select("id, item, category, done, notes, completed_by, completed_at, sort_order")
    .eq("quarter_id", quarter_id)
    .order("sort_order")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

const createSchema = z.object({
  quarter_id: z.string().uuid(),
  item: z.string().min(1).max(500),
  category: z.string().max(50).default("generale"),
  sort_order: z.number().int().default(99),
});

export async function POST(request: Request) {
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Caricamento template standard
  if (body.load_template && body.quarter_id) {
    const { supabase, profile } = ctx;
    // Evita duplicati: verifica se esistono già elementi
    const { data: existing } = await supabase
      .from("vigilanza_items")
      .select("id")
      .eq("quarter_id", body.quarter_id)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Checklist già presente per questo trimestre." }, { status: 409 });
    }

    const { error } = await supabase.from("vigilanza_items").insert(
      TEMPLATE_ITEMS.map((t) => ({
        ...t,
        quarter_id: body.quarter_id,
        tenant_id: profile.tenant_id,
      })),
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, count: TEMPLATE_ITEMS.length });
  }

  // Aggiunta singolo elemento
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { supabase, profile } = ctx;
  const { data, error } = await supabase
    .from("vigilanza_items")
    .insert({ ...parsed.data, tenant_id: profile.tenant_id })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
