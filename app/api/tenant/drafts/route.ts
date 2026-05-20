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

function generateTemplate(
  type: string,
  ctx: { companyName: string; year: number; revisorName: string },
): string {
  const { companyName, year, revisorName } = ctx;
  const today = new Date().toLocaleDateString("it-IT", {
    day: "2-digit", month: "long", year: "numeric",
  });

  switch (type) {
    case "relazione_revisione":
      return `RELAZIONE DI REVISIONE INDIPENDENTE

Agli azionisti / Ai soci di ${companyName}

Oggetto: Revisione legale del bilancio d'esercizio al 31 dicembre ${year}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RELAZIONE SUL BILANCIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Abbiamo svolto la revisione legale del bilancio di esercizio di ${companyName} al 31 dicembre ${year}, che comprende lo stato patrimoniale, il conto economico, il rendiconto finanziario e le note integrative.

RESPONSABILITÀ DEGLI AMMINISTRATORI PER IL BILANCIO
Gli amministratori sono responsabili della redazione del bilancio di esercizio che fornisca una rappresentazione veritiera e corretta in conformità alle norme italiane che ne disciplinano i criteri di redazione e al principio della prevalenza della sostanza sulla forma.

RESPONSABILITÀ DEL REVISORE
È nostra la responsabilità di esprimere un giudizio sul bilancio sulla base della revisione legale. Abbiamo svolto la revisione legale in conformità ai principi di revisione internazionali (ISA Italia). Tali principi richiedono il rispetto di principi etici, nonché la pianificazione e lo svolgimento della revisione al fine di acquisire una ragionevole sicurezza che il bilancio non contenga errori significativi.

GIUDIZIO
A nostro giudizio, il bilancio d'esercizio [fornisce una rappresentazione veritiera e corretta / non fornisce una rappresentazione veritiera e corretta — COMPLETARE] della situazione patrimoniale e finanziaria di ${companyName} al 31 dicembre ${year}, del risultato economico e dei flussi di cassa per l'esercizio chiuso a tale data, in conformità alle norme italiane che ne disciplinano i criteri di redazione.

[Luogo], ${today}

Il Revisore Legale
${revisorName}`;

    case "lettera_direzione":
      return `LETTERA DI DIREZIONE

${companyName}
Consiglio di Amministrazione / Organo Amministrativo

Oggetto: Comunicazione al management — Revisione legale esercizio ${year}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

In ottemperanza a quanto previsto dal principio di revisione internazionale ISA Italia 265 "Comunicazione delle carenze nel controllo interno al responsabile delle attività di governance e alla direzione", portiamo alla Vostra attenzione le osservazioni emerse nel corso della revisione legale del bilancio di esercizio chiuso al 31 dicembre ${year}.

RILIEVI SIGNIFICATIVI IDENTIFICATI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Inserire i rilievi emersi dalla revisione]

1. [Titolo rilievo]
   Descrizione: [...]
   Raccomandazione: [...]

RACCOMANDAZIONI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Inserire raccomandazioni generali]

Restiamo a disposizione per qualsiasi chiarimento o approfondimento.

[Luogo], ${today}

Il Revisore Legale
${revisorName}`;

    case "verbale_collegio":
      return `VERBALE DEL COLLEGIO SINDACALE N. ___

${companyName}

Seduta del ${today}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Il giorno [DATA], alle ore [ORA], si è riunito il Collegio Sindacale di ${companyName} nella sede sociale sita in [INDIRIZZO].

COMPONENTI PRESENTI:
• [Nome e Cognome] — Presidente del Collegio Sindacale
• [Nome e Cognome] — Sindaco effettivo
• [Nome e Cognome] — Sindaco effettivo

ORDINE DEL GIORNO:
1. [Punto all'ordine del giorno]
2. [Punto all'ordine del giorno]
3. Varie ed eventuali

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SVOLGIMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Descrizione dello svolgimento della seduta e delle deliberazioni adottate]

Non essendovi altro da discutere, la seduta è tolta alle ore [ORA].

Il Segretario                                Il Presidente
_______________________          _______________________`;

    case "verbale_sindaco":
      return `VERBALE DEL SINDACO UNICO N. ___

${companyName}

Data: ${today}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Il sottoscritto [NOME SINDACO UNICO], Sindaco Unico di ${companyName}, in data odierna ha svolto le seguenti attività di vigilanza per l'esercizio ${year}:

ATTIVITÀ SVOLTE:
• [Descrizione attività]
• [Descrizione attività]

OSSERVAZIONI:
[Inserire osservazioni emerse]

CONCLUSIONI:
[Inserire conclusioni]

[Luogo], ${today}

Il Sindaco Unico
${revisorName}`;

    default:
      return `[Titolo documento]\n\n${companyName} — Esercizio ${year}\n\n[Inserire contenuto del documento]\n\n[Luogo], ${today}\n\n${revisorName}`;
  }
}

export async function GET(request: Request) {
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const assignment_id = searchParams.get("assignment_id");
  const quarter_id = searchParams.get("quarter_id");

  if (!assignment_id && !quarter_id) {
    return NextResponse.json({ error: "assignment_id or quarter_id required" }, { status: 400 });
  }

  const { supabase } = ctx;
  let query = supabase
    .from("drafts")
    .select("id, title, type, status, created_by, created_at, updated_at, quarter_id")
    .order("created_at", { ascending: false });

  if (quarter_id) {
    query = query.eq("quarter_id", quarter_id);
  } else {
    query = query.eq("assignment_id", assignment_id!).is("quarter_id", null);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

const createSchema = z.object({
  assignment_id: z.string().uuid(),
  quarter_id: z.string().uuid().optional(),
  title: z.string().min(1).max(300),
  type: z.enum(["relazione_revisione", "lettera_direzione", "verbale_collegio", "verbale_sindaco", "altro"]),
});

export async function POST(request: Request) {
  const ctx = await requireTenantUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["tenant_owner", "revisor"].includes(ctx.profile.role)) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { supabase, profile, user } = ctx;

  // Recupera contesto incarico per pre-popolare il template
  const { data: assignment } = await supabase
    .from("assignments")
    .select("year, company_id")
    .eq("id", parsed.data.assignment_id)
    .maybeSingle();

  let companyName = "Azienda";
  if (assignment?.company_id) {
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", assignment.company_id)
      .maybeSingle();
    if (company?.name) companyName = company.name;
  }

  const content = generateTemplate(parsed.data.type, {
    companyName,
    year: assignment?.year ?? new Date().getFullYear(),
    revisorName: profile.full_name ?? "Il Revisore",
  });

  const { data, error } = await supabase
    .from("drafts")
    .insert({
      ...parsed.data,
      tenant_id: profile.tenant_id,
      created_by: user.id,
      content,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
