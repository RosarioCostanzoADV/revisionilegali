'use strict';

const { Draft } = require('../models');

const WRITER_ROLES = ['tenant_owner', 'revisor'];
const VALID_TYPES = ['relazione_revisione', 'lettera_direzione', 'verbale_collegio', 'verbale_sindaco', 'altro'];

// Template testo pre-compilato (portato da app/api/tenant/drafts/route.ts)
function generateTemplate(type, { companyName, year, revisorName }) {
    const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

    switch (type) {
        case 'relazione_revisione':
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

        case 'lettera_direzione':
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

        case 'verbale_collegio':
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

        case 'verbale_sindaco':
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

// GET /api/drafts?assignment_id=...&quarter_id=...
const listDrafts = async (req, res) => {
    try {
        const { assignment_id, quarter_id } = req.query;
        if (!assignment_id && !quarter_id) {
            return res.status(400).json({ error: 'assignment_id o quarter_id obbligatorio' });
        }

        const where = { tenant_id: req.user.tenant_id };
        if (quarter_id) {
            where.quarter_id = quarter_id;
        } else {
            where.assignment_id = assignment_id;
            where.quarter_id = null;
        }

        const drafts = await Draft.findAll({
            where,
            attributes: ['id', 'title', 'type', 'status', 'created_by', 'created_at', 'updated_at', 'quarter_id'],
            order: [['created_at', 'DESC']]
        });
        return res.json(drafts);
    } catch (err) {
        console.error('listDrafts error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// GET /api/drafts/:id
const getDraft = async (req, res) => {
    try {
        const draft = await Draft.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        if (!draft) return res.status(404).json({ error: 'Bozza non trovata' });
        return res.json(draft);
    } catch (err) {
        console.error('getDraft error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/drafts
const createDraft = async (req, res) => {
    try {
        if (!WRITER_ROLES.includes(req.user.role)) {
            return res.status(403).json({ error: 'Non autorizzato.' });
        }

        const { assignment_id, quarter_id, title, type, company_name, year, revisor_name } = req.body;

        if (!assignment_id) return res.status(400).json({ error: 'assignment_id obbligatorio' });
        if (!title || !title.trim()) return res.status(400).json({ error: 'title obbligatorio' });
        if (!VALID_TYPES.includes(type)) {
            return res.status(400).json({ error: `type non valido. Valori: ${VALID_TYPES.join(', ')}` });
        }

        const content = generateTemplate(type, {
            companyName: company_name || 'Azienda',
            year: year || new Date().getFullYear(),
            revisorName: revisor_name || req.user.full_name || 'Il Revisore'
        });

        const draft = await Draft.create({
            tenant_id: req.user.tenant_id,
            assignment_id,
            quarter_id: quarter_id || null,
            title: title.trim(),
            type,
            content,
            created_by: req.user.id || null
        });

        return res.status(201).json({ id: draft.id });
    } catch (err) {
        console.error('createDraft error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PATCH /api/drafts/:id
const updateDraft = async (req, res) => {
    try {
        if (!WRITER_ROLES.includes(req.user.role)) {
            return res.status(403).json({ error: 'Non autorizzato.' });
        }

        const draft = await Draft.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        if (!draft) return res.status(404).json({ error: 'Bozza non trovata' });

        const { title, content, status } = req.body;
        if (status !== undefined && !['bozza', 'definitivo'].includes(status)) {
            return res.status(400).json({ error: 'status non valido. Valori: bozza, definitivo' });
        }

        const updates = {};
        if (title !== undefined) {
            if (!String(title).trim()) return res.status(400).json({ error: 'title non può essere vuoto' });
            updates.title = title;
        }
        if (content !== undefined) updates.content = content;
        if (status !== undefined) updates.status = status;

        await draft.update(updates);
        return res.json({ ok: true });
    } catch (err) {
        console.error('updateDraft error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// DELETE /api/drafts/:id
const deleteDraft = async (req, res) => {
    try {
        const draft = await Draft.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        if (!draft) return res.status(404).json({ error: 'Bozza non trovata' });

        if (draft.status === 'definitivo') {
            return res.status(403).json({ error: 'Documento definitivo: non eliminabile.' });
        }

        const canDelete =
            String(draft.created_by) === String(req.user.id) ||
            WRITER_ROLES.includes(req.user.role);

        if (!canDelete) return res.status(403).json({ error: 'Non autorizzato.' });

        await draft.destroy();
        return res.json({ ok: true });
    } catch (err) {
        console.error('deleteDraft error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = { listDrafts, getDraft, createDraft, updateDraft, deleteDraft };
