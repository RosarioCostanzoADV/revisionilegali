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

function fmt(n: number) {
  return new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

// ─────────────────────────────────────────────
// POST — genera rilievi automatici dall'import
// ─────────────────────────────────────────────
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: importId } = await params;
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["tenant_owner", "revisor"].includes(ctx.profile.role)) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  const { supabase, profile } = ctx;

  const [{ data: imp }, { data: entries }] = await Promise.all([
    supabase
      .from("accounting_imports")
      .select("id, quarter_id, period_label, doc_type")
      .eq("id", importId)
      .maybeSingle(),
    supabase
      .from("accounting_entries")
      .select("id, account_code, account_name, balance, balance_prev")
      .eq("import_id", importId),
  ]);

  if (!imp) return NextResponse.json({ error: "Import non trovato" }, { status: 404 });

  const quarterId = imp.quarter_id;
  const docType = imp.doc_type ?? "bilancio_verifica";

  // Rilievi da inserire
  type FindingInsert = {
    quarter_id: string;
    tenant_id: string;
    raised_by: string;
    title: string;
    description: string;
    recommendation: string;
    severity: "bassa" | "media" | "alta" | "critica";
    status: string;
  };
  const toInsert: FindingInsert[] = [];

  // ─── BILANCIO DI VERIFICA ────────────────────────────────────────────────
  if (docType === "bilancio_verifica") {
    const hasPrev = (entries ?? []).some((e) => e.balance_prev !== null);
    const groups: Record<string, typeof entries> = {};
    for (const entry of entries ?? []) {
      const area = classifyAccount(entry.account_name);
      if (!groups[area]) groups[area] = [];
      groups[area]!.push(entry);
    }

    for (const [key, accs] of Object.entries(groups)) {
      if (!accs || accs.length === 0) continue;
      const balance = accs.reduce((s, e) => s + e.balance, 0);
      const balancePrev = accs.reduce((s, e) => s + (e.balance_prev ?? 0), 0);
      let variationPct: number | null = null;
      if (hasPrev && balancePrev !== 0) {
        variationPct = ((balance - balancePrev) / Math.abs(balancePrev)) * 100;
      }

      const criticalAccounts = accs.filter((e) => {
        if (!e.balance_prev || e.balance_prev === 0) return false;
        return Math.abs(((e.balance - e.balance_prev) / Math.abs(e.balance_prev)) * 100) >= 30;
      });

      const significantAccounts = accs.filter((e) => {
        if (!e.balance_prev || e.balance_prev === 0) return false;
        return Math.abs(((e.balance - e.balance_prev) / Math.abs(e.balance_prev)) * 100) >= 15;
      });

      const isCritical =
        criticalAccounts.length > 0 ||
        (variationPct !== null && Math.abs(variationPct) >= 30);
      const isHigh =
        significantAccounts.length >= 1 ||
        (variationPct !== null && Math.abs(variationPct) >= 20);
      const isMedium =
        variationPct !== null && Math.abs(variationPct) >= 10;

      let severity: FindingInsert["severity"] | null = null;
      if (isCritical) severity = "critica";
      else if (isHigh) severity = "alta";
      else if (isMedium) severity = "media";

      if (!severity) continue;

      const label = getAreaLabel(key);
      const procedures = getAreaProcedures(key);
      const pctStr = variationPct !== null
        ? `${variationPct >= 0 ? "+" : ""}${variationPct.toFixed(1)}%`
        : "n/d";

      const topCritical = criticalAccounts
        .slice(0, 5)
        .map((e) => {
          const pct = e.balance_prev && e.balance_prev !== 0
            ? ((e.balance - e.balance_prev) / Math.abs(e.balance_prev)) * 100
            : null;
          return `• ${e.account_name}: ${fmt(e.balance)} (prec. ${e.balance_prev ? fmt(e.balance_prev) : "n/d"}${pct !== null ? `, var. ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%` : ""})`;
        })
        .join("\n");

      const description =
        `Periodo: ${imp.period_label}\n` +
        `Variazione area: ${pctStr}\n` +
        `Saldo attuale: ${fmt(balance)}\n` +
        (balancePrev !== 0 ? `Saldo precedente: ${fmt(balancePrev)}\n` : "") +
        (topCritical ? `\nConti con variazioni critiche:\n${topCritical}` : "");

      toInsert.push({
        quarter_id: quarterId,
        tenant_id: profile.tenant_id!,
        raised_by: profile.id,
        title: `${label}: variazione ${pctStr} — rischio ${severity === "critica" ? "critico" : severity === "alta" ? "elevato" : "medio"}`,
        description,
        recommendation: procedures.slice(0, 3).join("\n"),
        severity,
        status: "aperto",
      });
    }
  }

  // ─── ESTRATTO CONTO — riconciliazione bancaria ───────────────────────────
  if (docType === "estratto_conto") {
    // Cerca il bilancio più recente per lo stesso trimestre
    const { data: bilancioImport } = await supabase
      .from("accounting_imports")
      .select("id")
      .eq("quarter_id", quarterId)
      .eq("doc_type", "bilancio_verifica")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const bilancioEntries: { account_name: string; balance: number }[] = [];
    if (bilancioImport) {
      const { data: be } = await supabase
        .from("accounting_entries")
        .select("account_name, balance")
        .eq("import_id", bilancioImport.id);
      // Filtra solo conti banca/cassa
      for (const e of be ?? []) {
        const area = classifyAccount(e.account_name);
        if (area === "cassa_banche" || area === "disponibilita_liquide") {
          bilancioEntries.push(e);
        }
      }
    }

    // Per ogni voce dell'estratto conto, confronta col bilancio
    for (const entry of entries ?? []) {
      const normalizedName = entry.account_name.toLowerCase().replace(/\s+/g, " ").trim();

      // Cerca match nel bilancio per somiglianza di nome
      const match = bilancioEntries.find((b) => {
        const bn = b.account_name.toLowerCase().replace(/\s+/g, " ").trim();
        return bn.includes(normalizedName) || normalizedName.includes(bn) ||
          (normalizedName.length > 5 && bn.includes(normalizedName.substring(0, 6)));
      });

      if (match) {
        const diff = entry.balance - match.balance;
        if (Math.abs(diff) > 0.01) {
          toInsert.push({
            quarter_id: quarterId,
            tenant_id: profile.tenant_id!,
            raised_by: profile.id,
            title: `Saldo non riconciliato: ${entry.account_name}`,
            description:
              `Differenza rilevata tra estratto conto e bilancio di verifica.\n` +
              `Saldo estratto conto: ${fmt(entry.balance)}\n` +
              `Saldo bilancio:       ${fmt(match.balance)}\n` +
              `Differenza:           ${fmt(diff)}`,
            recommendation:
              "Verificare le registrazioni contabili del periodo.\n" +
              "Richiedere estratto conto ufficiale alla banca.\n" +
              "Riconciliare voce per voce le movimentazioni.",
            severity: Math.abs(diff) > 1000 ? "alta" : "media",
            status: "aperto",
          });
        }
      } else if (bilancioEntries.length > 0) {
        // Conto presente nell'estratto ma non trovato nel bilancio
        toInsert.push({
          quarter_id: quarterId,
          tenant_id: profile.tenant_id!,
          raised_by: profile.id,
          title: `Conto non trovato in bilancio: ${entry.account_name}`,
          description:
            `Il conto "${entry.account_name}" con saldo ${fmt(entry.balance)} ` +
            `risulta nell'estratto conto ma non è stato trovato nel bilancio di verifica.`,
          recommendation:
            "Verificare se il conto è stato correttamente registrato in contabilità.",
          severity: "alta",
          status: "aperto",
        });
      }
    }

    // Se non c'è bilancio, crea un rilievo generico per ogni conto
    if (bilancioEntries.length === 0) {
      for (const entry of entries ?? []) {
        toInsert.push({
          quarter_id: quarterId,
          tenant_id: profile.tenant_id!,
          raised_by: profile.id,
          title: `Saldo bancario da verificare: ${entry.account_name}`,
          description:
            `Saldo dichiarato nell'estratto conto: ${fmt(entry.balance)}\n` +
            `Nessun bilancio di verifica importato per questo trimestre — impossibile riconciliare automaticamente.`,
          recommendation:
            "Importare il bilancio di verifica per abilitare la riconciliazione automatica.\n" +
            "Verificare manualmente il saldo con la contabilità.",
          severity: "media",
          status: "aperto",
        });
      }
    }
  }

  // ─── RIMANENZE — analisi di coerenza ─────────────────────────────────────
  if (docType === "rimanenze") {
    // Cerca il fatturato nel bilancio più recente dello stesso trimestre
    const { data: bilancioImport } = await supabase
      .from("accounting_imports")
      .select("id")
      .eq("quarter_id", quarterId)
      .eq("doc_type", "bilancio_verifica")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let fatturato = 0;
    let fatturatoPrec = 0;
    if (bilancioImport) {
      const { data: be } = await supabase
        .from("accounting_entries")
        .select("account_name, balance, balance_prev")
        .eq("import_id", bilancioImport.id);
      for (const e of be ?? []) {
        const area = classifyAccount(e.account_name);
        if (area === "ricavi") {
          fatturato += Math.abs(e.balance);
          fatturatoPrec += Math.abs(e.balance_prev ?? 0);
        }
      }
    }

    const totRimanenze = (entries ?? []).reduce((s, e) => s + e.balance, 0);
    const totRimanenzePrec = (entries ?? []).reduce((s, e) => s + (e.balance_prev ?? 0), 0);

    // Variazione rimanenze
    if (totRimanenzePrec > 0) {
      const varRimanenze = ((totRimanenze - totRimanenzePrec) / Math.abs(totRimanenzePrec)) * 100;
      if (Math.abs(varRimanenze) >= 20) {
        toInsert.push({
          quarter_id: quarterId,
          tenant_id: profile.tenant_id!,
          raised_by: profile.id,
          title: `Rimanenze: variazione significativa ${varRimanenze >= 0 ? "+" : ""}${varRimanenze.toFixed(1)}%`,
          description:
            `Rimanenze attuali:   ${fmt(totRimanenze)}\n` +
            `Rimanenze precedenti: ${fmt(totRimanenzePrec)}\n` +
            `Variazione:          ${varRimanenze >= 0 ? "+" : ""}${varRimanenze.toFixed(1)}%`,
          recommendation:
            "Verificare la valorizzazione delle rimanenze.\n" +
            "Controllare il metodo di inventario (FIFO, LIFO, costo medio).\n" +
            "Richiedere documentazione di supporto (inventario fisico).",
          severity: Math.abs(varRimanenze) >= 50 ? "critica" : "alta",
          status: "aperto",
        });
      }
    }

    // Rapporto rimanenze/fatturato
    if (fatturato > 0) {
      const ratio = (totRimanenze / fatturato) * 100;
      if (ratio > 40) {
        toInsert.push({
          quarter_id: quarterId,
          tenant_id: profile.tenant_id!,
          raised_by: profile.id,
          title: `Rimanenze elevate rispetto al fatturato (${ratio.toFixed(1)}%)`,
          description:
            `Totale rimanenze: ${fmt(totRimanenze)}\n` +
            `Fatturato periodo: ${fmt(fatturato)}\n` +
            `Rapporto rimanenze/fatturato: ${ratio.toFixed(1)}% (soglia: 40%)`,
          recommendation:
            "Analizzare la rotazione del magazzino.\n" +
            "Verificare l'obsolescenza delle rimanenze.\n" +
            "Valutare eventuali svalutazioni necessarie.",
          severity: ratio > 80 ? "critica" : ratio > 60 ? "alta" : "media",
          status: "aperto",
        });
      }
    }
  }

  // ─── REGISTRO IVA ─────────────────────────────────────────────────────────
  if (docType === "registro_iva") {
    // Cerca anomalie nelle aliquote IVA (i conti IVA hanno importi che dovrebbero essere coerenti)
    const ivaConti = (entries ?? []).filter((e) =>
      e.account_name.toLowerCase().includes("iva") ||
      e.account_name.toLowerCase().includes("imposta")
    );
    const totIva = ivaConti.reduce((s, e) => s + Math.abs(e.balance), 0);
    const totBase = (entries ?? [])
      .filter((e) => !e.account_name.toLowerCase().includes("iva"))
      .reduce((s, e) => s + Math.abs(e.balance), 0);

    if (totBase > 0 && totIva > 0) {
      const ivaRatio = (totIva / totBase) * 100;
      // L'IVA standard è 22%, ma se il ratio è molto diverso potrebbe essere anomalo
      if (ivaRatio > 30 || ivaRatio < 5) {
        toInsert.push({
          quarter_id: quarterId,
          tenant_id: profile.tenant_id!,
          raised_by: profile.id,
          title: `Rapporto IVA/imponibile anomalo: ${ivaRatio.toFixed(1)}%`,
          description:
            `Totale imponibile: ${fmt(totBase)}\n` +
            `Totale IVA:        ${fmt(totIva)}\n` +
            `Rapporto:          ${ivaRatio.toFixed(1)}% (atteso: 5–30%)`,
          recommendation:
            "Verificare l'aliquota IVA applicata alle singole operazioni.\n" +
            "Controllare l'eventuale presenza di operazioni esenti o non imponibili.\n" +
            "Riconciliare con le liquidazioni IVA periodiche.",
          severity: ivaRatio > 40 || ivaRatio < 3 ? "alta" : "media",
          status: "aperto",
        });
      }
    }
  }

  if (toInsert.length === 0) {
    return NextResponse.json({
      created: 0,
      message: "Nessuna anomalia rilevata. Nessun rilievo generato.",
    });
  }

  // Evita duplicati: controlla rilievi già esistenti con stesso titolo nel trimestre
  const { data: existingFindings } = await supabase
    .from("findings")
    .select("title")
    .eq("quarter_id", quarterId);
  const existingTitles = new Set((existingFindings ?? []).map((f) => f.title));
  const newFindings = toInsert.filter((f) => !existingTitles.has(f.title));

  if (newFindings.length === 0) {
    return NextResponse.json({
      created: 0,
      message: "Rilievi già presenti per questo trimestre.",
    });
  }

  const { data: created, error } = await supabase
    .from("findings")
    .insert(newFindings)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ created: created?.length ?? 0 });
}
