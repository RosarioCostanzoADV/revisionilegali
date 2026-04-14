import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyAccount, getAreaLabel, getAreaProcedures } from "@/lib/audit/classification";

export const dynamic = "force-dynamic";

async function requireTenantUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, role, tenant_id, is_active, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_active || !profile.tenant_id) return null;
  return { supabase, profile, user };
}

// POST — genera le carte di lavoro dal piano di rischio
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: importId } = await params;
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabase, profile } = ctx;

  // Carica l'import + entries
  const [{ data: imp }, { data: entries }] = await Promise.all([
    supabase
      .from("accounting_imports")
      .select("id, quarter_id, period_label")
      .eq("id", importId)
      .maybeSingle(),
    supabase
      .from("accounting_entries")
      .select("id, account_code, account_name, balance, balance_prev")
      .eq("import_id", importId),
  ]);

  if (!imp) return NextResponse.json({ error: "Import non trovato" }, { status: 404 });

  const quarterId = imp.quarter_id;
  const hasPrev = (entries ?? []).some((e) => e.balance_prev !== null);

  // Raggruppa per area
  const groups: Record<string, typeof entries> = {};
  for (const entry of entries ?? []) {
    const area = classifyAccount(entry.account_name);
    if (!groups[area]) groups[area] = [];
    groups[area]!.push(entry);
  }

  // Calcola rischio per area
  interface AreaRisk {
    key: string;
    riskLevel: "high" | "medium" | "low" | "unknown";
    variationPct: number | null;
    significantAccounts: { code: string | null; name: string; balance: number; balance_prev: number | null; variationPct: number | null }[];
  }

  const areaRisks: AreaRisk[] = [];
  for (const [key, accs] of Object.entries(groups)) {
    if (!accs) continue;
    const balance = accs.reduce((s, e) => s + e.balance, 0);
    const balancePrev = accs.reduce((s, e) => s + (e.balance_prev ?? 0), 0);
    let variationPct: number | null = null;
    if (hasPrev && balancePrev !== 0) {
      variationPct = ((balance - balancePrev) / Math.abs(balancePrev)) * 100;
    }

    const significantAccounts = accs
      .filter((e) => {
        if (!e.balance_prev || e.balance_prev === 0) return false;
        return Math.abs(((e.balance - e.balance_prev) / Math.abs(e.balance_prev)) * 100) >= 15;
      })
      .map((e) => ({
        code: e.account_code,
        name: e.account_name,
        balance: e.balance,
        balance_prev: e.balance_prev,
        variationPct: e.balance_prev && e.balance_prev !== 0
          ? ((e.balance - e.balance_prev) / Math.abs(e.balance_prev)) * 100
          : null,
      }));

    const criticalCount = significantAccounts.filter(
      (e) => e.variationPct !== null && Math.abs(e.variationPct) >= 30,
    ).length;

    let riskLevel: AreaRisk["riskLevel"];
    if (!hasPrev) {
      riskLevel = "unknown";
    } else if (
      criticalCount > 0 ||
      (variationPct !== null && Math.abs(variationPct) >= 20) ||
      significantAccounts.length >= 3
    ) {
      riskLevel = "high";
    } else if (
      significantAccounts.length >= 1 ||
      (variationPct !== null && Math.abs(variationPct) >= 10)
    ) {
      riskLevel = "medium";
    } else {
      riskLevel = "low";
    }

    areaRisks.push({ key, riskLevel, variationPct, significantAccounts });
  }

  // Genera solo per aree HIGH e MEDIUM (o tutte se non c'è prev)
  const areasToGenerate = areaRisks.filter(
    (a) => a.riskLevel === "high" || a.riskLevel === "medium" || a.riskLevel === "unknown",
  );
  if (areasToGenerate.length === 0) {
    return NextResponse.json({ created: 0, message: "Nessuna area a rischio identificata." });
  }

  // Controlla carte già esistenti per questo trimestre
  const { data: existingPapers } = await supabase
    .from("working_papers")
    .select("area")
    .eq("quarter_id", quarterId);
  const existingAreas = new Set((existingPapers ?? []).map((p) => p.area));

  const fmt = (n: number) =>
    new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const papersToInsert: {
    quarter_id: string;
    tenant_id: string;
    title: string;
    area: string;
    status: string;
    content: string;
    prepared_by: string;
  }[] = [];

  for (const ar of areasToGenerate) {
    if (existingAreas.has(ar.key)) continue; // già esiste

    const label = getAreaLabel(ar.key);
    const procedures = getAreaProcedures(ar.key);
    const accs = groups[ar.key] ?? [];

    // Conti più rilevanti (ordine per variazione assoluta)
    const topAccounts = [...accs]
      .map((e) => ({
        ...e,
        absPct: e.balance_prev && e.balance_prev !== 0
          ? Math.abs(((e.balance - e.balance_prev) / Math.abs(e.balance_prev)) * 100)
          : 0,
      }))
      .sort((a, b) => b.absPct - a.absPct)
      .slice(0, 8);

    const hasPrevLocal = topAccounts.some((e) => e.balance_prev !== null);

    let content = `CARTA DI LAVORO — ${label.toUpperCase()}
Periodo: ${imp.period_label}
Livello di rischio: ${ar.riskLevel === "high" ? "ALTO" : ar.riskLevel === "medium" ? "MEDIO" : "DA VERIFICARE"}
${ar.variationPct !== null ? `Variazione area: ${ar.variationPct >= 0 ? "+" : ""}${ar.variationPct.toFixed(1)}%` : ""}

═══════════════════════════════════════════════════
CONTI RILEVANTI DELL'AREA
═══════════════════════════════════════════════════
`;

    for (const e of topAccounts) {
      const pct = e.balance_prev && e.balance_prev !== 0
        ? ((e.balance - e.balance_prev) / Math.abs(e.balance_prev)) * 100
        : null;
      content += `\n${e.account_code ? `[${e.account_code}] ` : ""}${e.account_name}`;
      content += `\n  Saldo attuale:   ${fmt(e.balance)}`;
      if (hasPrevLocal && e.balance_prev !== null) {
        content += `\n  Saldo precedente: ${fmt(e.balance_prev)}`;
        if (pct !== null) {
          content += `\n  Variazione:       ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%${Math.abs(pct) >= 30 ? " ⚠ CRITICA" : Math.abs(pct) >= 15 ? " ⚠ SIGNIFICATIVA" : ""}`;
        }
      }
      content += "\n";
    }

    content += `
═══════════════════════════════════════════════════
PROCEDURE DI REVISIONE
═══════════════════════════════════════════════════

`;
    content += procedures.join("\n");

    content += `

═══════════════════════════════════════════════════
CONCLUSIONI DEL REVISORE
═══════════════════════════════════════════════════

Anomalie riscontrate: □ Sì  □ No

Note e osservazioni:
[da compilare]

Rilievi aperti: □ Sì (vedi sezione Rilievi)  □ No

Il revisore: ___________________   Data: ___________
`;

    papersToInsert.push({
      quarter_id: quarterId,
      tenant_id: profile.tenant_id!,
      title: `Revisione ${label} — ${imp.period_label}`,
      area: ar.key,
      status: "bozza",
      content,
      prepared_by: profile.id,
    });
  }

  if (papersToInsert.length === 0) {
    return NextResponse.json({
      created: 0,
      message: "Tutte le carte di lavoro per le aree a rischio esistono già.",
    });
  }

  const { data: created, error } = await supabase
    .from("working_papers")
    .insert(papersToInsert)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    created: created?.length ?? 0,
    quarter_id: quarterId,
  });
}
