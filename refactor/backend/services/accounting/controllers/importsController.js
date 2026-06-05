'use strict';

const fs   = require('fs');
const http = require('http');
const { parseCSV, parseSpreadsheet, parsePDF } = require('../lib/parsers');

const AI_SERVICE_URL       = process.env.AI_SERVICE_URL       || 'http://ai-service:3008';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'change_me_in_production';

/**
 * Chiama ai-service per mappare le voci contabili.
 * Restituisce un array parallelo a `entries` con i campi AI,
 * oppure null in caso di errore (fallback: voci salvate senza mappatura).
 */
function callAiService(entries) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      entries: entries.map((e) => ({
        account_code: e.account_code || null,
        account_name: e.account_name,
        balance:      e.balance,
        balance_prev: e.balance_prev || null,
        pdf_section:  e.pdf_section  || null,
      })),
    });

    const url  = new URL('/api/map-bilancio', AI_SERVICE_URL);
    const opts = {
      hostname: url.hostname,
      port:     url.port || 80,
      path:     url.pathname,
      method:   'POST',
      headers:  {
        'Content-Type':     'application/json',
        'Content-Length':   Buffer.byteLength(payload),
        'X-Internal-Token': INTERNAL_SERVICE_TOKEN,
      },
    };

    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try {
          const body = JSON.parse(raw);
          if (res.statusCode === 200 && Array.isArray(body.entries)) {
            // Restituisce array indicizzato parallelo a `entries`
            resolve(body.entries);
          } else {
            console.warn('ai-service risposta inattesa:', res.statusCode);
            resolve(null);
          }
        } catch {
          console.warn('ai-service risposta non parsabile');
          resolve(null);
        }
      });
    });

    req.setTimeout(30_000, () => {
      console.warn('ai-service timeout — mapping saltato');
      req.destroy();
      resolve(null);
    });

    req.on('error', (err) => {
      console.warn('ai-service non raggiungibile:', err.message);
      resolve(null);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * POST /api/accounting/imports
 * Riceve un file (CSV/XLSX/PDF), lo fa parsare e salva le voci nel DB.
 * L'upload multer viene gestito nella route prima di questo controller.
 */
async function createImport(req, res) {
  const { AccountingImport, AccountingEntry } = req.app.locals.db;
  const tenantId = req.user.tenant_id;

  // ── Percorso JSON: entries già parsate dal wizard (no file upload) ─────────
  if (!req.file && Array.isArray(req.body.entries)) {
    const { assignment_id, quarter_id, doc_type, filename, entries } = req.body;
    if (!assignment_id) return res.status(400).json({ error: 'assignment_id obbligatorio.' });
    if (!filename)      return res.status(400).json({ error: 'filename obbligatorio.' });

    const fileType = doc_type ?? 'altro';
    let importRecord;
    try {
      importRecord = await AccountingImport.create({
        tenant_id:    tenantId,
        assignment_id,
        quarter_id:   quarter_id || null,
        file_name:    filename,
        file_type:    fileType,
        status:       'completed',
        entry_count:  entries.length,
        imported_by:  req.user.id || req.user.sub,
      });

      const rows = entries.map((e) => ({
        tenant_id:          tenantId,
        import_id:          importRecord.id,
        account_code:       e.account_code       || null,
        account_name:       e.account_name,
        balance:            e.balance,
        balance_prev:       e.balance_prev        || null,
        pdf_section:        e.pdf_section         || null,
        voce_bilancio:      e.voce_bilancio        ?? e.voce_standard      ?? null,
        voce_bilancio_code: e.voce_bilancio_code   ?? e.schema_civilistico ?? null,
        mapped_at:          (e.voce_bilancio || e.voce_standard) ? new Date() : null,
      }));
      await AccountingEntry.bulkCreate(rows);

      return res.status(201).json({ id: importRecord.id, status: 'completed', entry_count: entries.length });
    } catch (err) {
      console.error('createImport (json) error:', err);
      if (importRecord) await importRecord.update({ status: 'error', error_message: err.message }).catch(() => {});
      return res.status(500).json({ error: 'Errore salvataggio import.' });
    }
  }

  // ── Percorso file: upload multipart ────────────────────────────────────────
  if (!req.file) {
    return res.status(400).json({ error: 'File obbligatorio.' });
  }

  const { assignment_id, quarter_id } = req.body;
  if (!assignment_id) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'assignment_id obbligatorio.' });
  }

  const mime = req.file.mimetype.toLowerCase();
  let fileType;
  if (mime === 'application/pdf') {
    fileType = 'pdf';
  } else if (
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/vnd.ms-excel'
  ) {
    fileType = 'xlsx';
  } else {
    fileType = 'csv';
  }

  // Crea il record import in stato pending
  let importRecord;
  try {
    importRecord = await AccountingImport.create({
      tenant_id: tenantId,
      assignment_id,
      quarter_id: quarter_id || null,
      file_name: req.file.originalname,
      file_type: fileType,
      status: 'processing',
      entry_count: 0,
      imported_by: req.user.id || req.user.sub,
    });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    console.error('createImport DB error:', err);
    return res.status(500).json({ error: 'Errore creazione record import.' });
  }

  // Parse asincrono — rispondiamo subito con 202
  res.status(202).json({
    id: importRecord.id,
    status: 'processing',
    message: 'Import avviato. Recupera lo stato con GET /imports/:id',
  });

  // Parsing in background
  (async () => {
    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      let entries = [];

      if (fileType === 'pdf') {
        entries = await parsePDF(fileBuffer.buffer);
      } else if (fileType === 'xlsx') {
        entries = parseSpreadsheet(fileBuffer.buffer);
      } else {
        entries = parseCSV(fileBuffer.toString('utf-8'));
      }

      if (entries.length > 0) {
        // Chiama ai-service per la mappatura delle voci (fire-and-wait con fallback)
        const aiEntries = await callAiService(entries);

        const rows = entries.map((e, i) => {
          const ai = aiEntries?.[i];
          return {
            tenant_id:          tenantId,
            import_id:          importRecord.id,
            account_code:       e.account_code       || null,
            account_name:       e.account_name,
            balance:            e.balance,
            balance_prev:       e.balance_prev        || null,
            pdf_section:        e.pdf_section         || null,
            voce_bilancio:      ai?.voce_standard      ?? null,
            voce_bilancio_code: ai?.schema_civilistico ?? null,
            mapped_at:          ai ? new Date()        : null,
          };
        });
        await AccountingEntry.bulkCreate(rows);
      }

      await importRecord.update({ status: 'completed', entry_count: entries.length });
    } catch (err) {
      console.error('Parsing error:', err);
      await importRecord.update({ status: 'error', error_message: err.message });
    } finally {
      fs.unlink(req.file.path, () => {});
    }
  })();
}

/**
 * GET /api/accounting/imports?assignment_id=
 */
async function listImports(req, res) {
  const { AccountingImport } = req.app.locals.db;
  const tenantId = req.user.tenant_id;
  const { assignment_id } = req.query;

  const where = { tenant_id: tenantId };
  if (assignment_id) where.assignment_id = assignment_id;

  try {
    const imports = await AccountingImport.findAll({
      where,
      order: [['created_at', 'DESC']],
    });
    res.json(imports);
  } catch (err) {
    console.error('listImports error:', err);
    res.status(500).json({ error: 'Errore recupero imports.' });
  }
}

/**
 * GET /api/accounting/imports/:id
 */
async function getImport(req, res) {
  const { AccountingImport } = req.app.locals.db;
  const tenantId = req.user.tenant_id;

  try {
    const record = await AccountingImport.findOne({
      where: { id: req.params.id, tenant_id: tenantId },
    });
    if (!record) return res.status(404).json({ error: 'Import non trovato.' });
    res.json(record);
  } catch (err) {
    console.error('getImport error:', err);
    res.status(500).json({ error: 'Errore recupero import.' });
  }
}

/**
 * GET /api/accounting/imports/:id/entries
 */
async function listEntries(req, res) {
  const { AccountingImport, AccountingEntry } = req.app.locals.db;
  const tenantId = req.user.tenant_id;

  try {
    const record = await AccountingImport.findOne({
      where: { id: req.params.id, tenant_id: tenantId },
    });
    if (!record) return res.status(404).json({ error: 'Import non trovato.' });

    const entries = await AccountingEntry.findAll({
      where: { import_id: req.params.id, tenant_id: tenantId },
      order: [['account_code', 'ASC'], ['account_name', 'ASC']],
    });
    res.json(entries);
  } catch (err) {
    console.error('listEntries error:', err);
    res.status(500).json({ error: 'Errore recupero voci.' });
  }
}

/**
 * PATCH /api/accounting/entries/:entryId
 * Aggiorna la mappatura AI di una singola voce.
 */
async function updateEntry(req, res) {
  const { AccountingEntry } = req.app.locals.db;
  const tenantId = req.user.tenant_id;

  try {
    const entry = await AccountingEntry.findOne({
      where: { id: req.params.entryId, tenant_id: tenantId },
    });
    if (!entry) return res.status(404).json({ error: 'Voce non trovata.' });

    const { voce_bilancio, voce_bilancio_code } = req.body;
    const updates = {};
    if (voce_bilancio !== undefined) updates.voce_bilancio = voce_bilancio;
    if (voce_bilancio_code !== undefined) updates.voce_bilancio_code = voce_bilancio_code;
    if (Object.keys(updates).length > 0) {
      updates.mapped_at = new Date();
      await entry.update(updates);
    }

    res.json(entry);
  } catch (err) {
    console.error('updateEntry error:', err);
    res.status(500).json({ error: 'Errore aggiornamento voce.' });
  }
}

/**
 * DELETE /api/accounting/imports/:id
 */
async function deleteImport(req, res) {
  const { AccountingImport, AccountingEntry } = req.app.locals.db;
  const tenantId = req.user.tenant_id;

  try {
    const record = await AccountingImport.findOne({
      where: { id: req.params.id, tenant_id: tenantId },
    });
    if (!record) return res.status(404).json({ error: 'Import non trovato.' });

    // Cancella prima le entries (FK constraint non ha CASCADE a livello DB)
    await AccountingEntry.destroy({ where: { import_id: record.id } });
    await record.destroy();
    res.status(204).send();
  } catch (err) {
    console.error('deleteImport error:', err);
    res.status(500).json({ error: 'Errore eliminazione import.' });
  }
}

/**
 * POST /api/accounting/imports/ai-preview
 * Riceve un file, lo parsa e chiama ai-service per la mappatura.
 * Restituisce le voci con i suggerimenti AI senza salvare nulla nel DB.
 */
async function aiPreview(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'File obbligatorio.' });
  }

  const mime = req.file.mimetype.toLowerCase();
  let fileType;
  if (mime === 'application/pdf') {
    fileType = 'pdf';
  } else if (
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/vnd.ms-excel'
  ) {
    fileType = 'xlsx';
  } else {
    fileType = 'csv';
  }

  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    let entries = [];

    if (fileType === 'pdf') {
      entries = await parsePDF(fileBuffer.buffer);
    } else if (fileType === 'xlsx') {
      entries = parseSpreadsheet(fileBuffer.buffer);
    } else {
      entries = parseCSV(fileBuffer.toString('utf-8'));
    }

    const aiEntries = await callAiService(entries);

    const preview = entries.map((e, i) => {
      const ai = aiEntries?.[i];
      return {
        account_code:       e.account_code       || null,
        account_name:       e.account_name,
        balance:            e.balance,
        balance_prev:       e.balance_prev        || null,
        pdf_section:        e.pdf_section         || null,
        voce_bilancio:      ai?.voce_standard      ?? null,
        voce_bilancio_code: ai?.schema_civilistico ?? null,
      };
    });

    res.json({ entries: preview, entry_count: preview.length });
  } catch (err) {
    console.error('aiPreview error:', err);
    res.status(500).json({ error: 'Errore durante il parsing o la mappatura AI.' });
  } finally {
    fs.unlink(req.file.path, () => {});
  }
}

// ── Classificazione voci per area di revisione ────────────────────────────────
const AREA_KEYWORDS = {
  cassa_banche:      ['cassa', 'banca', 'c/c', 'conto corrente', 'depositi bancari', 'banche c/c', 'istituti di credito', 'disponibilità liquide', 'assegni', 'valori bollati'],
  crediti_clienti:   ['crediti verso clienti', 'crediti clienti', 'fatture da emettere', 'effetti attivi', 'ricevute bancarie', 'crediti commerciali', 'crediti tributari', 'credito iva', 'ratei attivi', 'risconti attivi', 'acconti', 'depositi cauzionali'],
  debiti_fornitori:  ['debiti verso fornitori', 'debiti fornitori', 'fatture da ricevere', 'debiti commerciali', 'note credito da ricevere', 'anticipi da clienti', 'debiti vs fornitori'],
  immobilizzazioni:  ['immobilizzaz', 'attrezzatur', 'macchinari', 'fabbricat', 'terreni', 'avviamento', 'brevett', 'marchi', 'software', 'licenze', 'impianti', 'cespiti', 'mobili', 'autoveicoli', 'costi di impianto', 'f.do amm', 'f.do ammort', 'fondo ammort'],
  rimanenze:         ['rimanenz', 'magazzino', 'merci', 'prodotti finiti', 'semilavorati', 'materie prime', 'scorte', 'giacenze'],
  patrimonio_netto:  ['capitale sociale', 'riserva legale', 'riserva straordinaria', 'riserve', 'utile portato', 'perdita portata', 'patrimonio netto', 'versamenti soci'],
  ricavi:            ['ricavi', 'vendita', 'proventi', 'fatturato', 'corrispettivi'],
  costi:             ['acquisti', 'costi', 'spese', 'oneri', 'commissioni', 'interessi passivi', 'ammortamento', 'sanzioni', 'trasporti su'],
  imposte:           ['iva', 'ires', 'irap', 'imposte', 'erario', 'debiti tributari', 'debiti verso erario', 'ritenute', 'liquidazione iva', 'acconti ires', 'acconti irap'],
};

function classifyForWorkingPaper(accountName) {
  const lower = accountName.toLowerCase();
  for (const [area, keywords] of Object.entries(AREA_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) return area;
  }
  return 'altro';
}

const AREA_LABELS = {
  cassa_banche:     'Disponibilità Liquide e Banche',
  crediti_clienti:  'Crediti verso Clienti e Altri Crediti',
  debiti_fornitori: 'Debiti verso Fornitori',
  immobilizzazioni: 'Immobilizzazioni e Fondi Ammortamento',
  rimanenze:        'Rimanenze di Magazzino',
  patrimonio_netto: 'Patrimonio Netto',
  ricavi:           'Ricavi e Proventi',
  costi:            'Costi e Oneri',
  imposte:          'Imposte e Tributi',
  altro:            'Altri Conti',
};

/**
 * GET /api/accounting/imports/:id/analisi
 * Restituisce le voci dell'import — usato server-side per il calcolo aree rischio.
 */
async function getAnalisi(req, res) {
  const { AccountingImport, AccountingEntry } = req.app.locals.db;
  const tenantId = req.user.tenant_id;

  try {
    const record = await AccountingImport.findOne({
      where: { id: req.params.id, tenant_id: tenantId },
    });
    if (!record) return res.status(404).json({ error: 'Import non trovato.' });

    const entries = await AccountingEntry.findAll({
      where: { import_id: req.params.id, tenant_id: tenantId },
      attributes: ['id', 'account_code', 'account_name', 'balance', 'balance_prev'],
      order: [['account_code', 'ASC'], ['account_name', 'ASC']],
    });
    res.json(entries);
  } catch (err) {
    console.error('getAnalisi error:', err);
    res.status(500).json({ error: 'Errore recupero voci analisi.' });
  }
}

/**
 * POST /api/accounting/imports/:id/analisi
 * Genera le carte di lavoro per aree di rischio nell'audit-service.
 * Ritorna { created, quarter_id }.
 */
async function postAnalisi(req, res) {
  const { AccountingImport, AccountingEntry } = req.app.locals.db;
  const tenantId = req.user.tenant_id;
  const AUDIT_SERVICE_URL = process.env.AUDIT_SERVICE_URL || 'http://audit-service:3005';

  try {
    const record = await AccountingImport.findOne({
      where: { id: req.params.id, tenant_id: tenantId },
    });
    if (!record) return res.status(404).json({ error: 'Import non trovato.' });
    if (!record.quarter_id) return res.status(400).json({ error: 'Import non associato a un trimestre.' });

    const entries = await AccountingEntry.findAll({
      where: { import_id: req.params.id, tenant_id: tenantId },
    });

    // Raggruppa per area
    const groups = {};
    for (const e of entries) {
      const area = classifyForWorkingPaper(e.account_name);
      if (!groups[area]) groups[area] = [];
      groups[area].push(e);
    }

    const token = (req.headers['authorization'] || '').replace('Bearer ', '');
    let created = 0;

    for (const [area, areaEntries] of Object.entries(groups)) {
      const balance = areaEntries.reduce((s, e) => s + parseFloat(e.balance || 0), 0);
      const title = `${AREA_LABELS[area] || area} — ${record.file_name}`;
      const content = areaEntries.map((e) =>
        `${e.account_code ? e.account_code + ' – ' : ''}${e.account_name}: ${parseFloat(e.balance).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
      ).join('\n');

      try {
        const resp = await fetch(`${AUDIT_SERVICE_URL}/api/audit/working-papers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            quarter_id: record.quarter_id,
            title,
            area,
            content: `Saldo totale area: ${balance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}\n\n${content}`,
          }),
        });
        if (resp.ok) created++;
        else console.warn(`postAnalisi: working-paper area ${area} → ${resp.status}`);
      } catch (err) {
        console.warn(`postAnalisi: audit-service non raggiungibile per area ${area}:`, err.message);
      }
    }

    res.json({ created, quarter_id: record.quarter_id });
  } catch (err) {
    console.error('postAnalisi error:', err);
    res.status(500).json({ error: 'Errore generazione analisi.' });
  }
}

// POST /api/accounting/imports/:id/rilievi
// Analizza le voci e crea rilievi automatici nell'audit-service
async function generateRilievi(req, res) {
  const db = req.app.locals.db;
  try {
    const record = await db.AccountingImport.findOne({
      where: { id: req.params.id, tenant_id: req.user.tenant_id },
      include: [{ model: db.AccountingEntry, as: 'entries' }],
    });
    if (!record) return res.status(404).json({ error: 'Import non trovato.' });

    const entries = record.entries || [];
    if (entries.length === 0) return res.json({ created: 0, message: 'Nessuna voce presente.' });

    // Rileva variazioni significative rispetto al periodo precedente (soglia 20%)
    const candidates = [];
    for (const e of entries) {
      const bal = parseFloat(e.balance) || 0;
      const prev = e.balance_prev != null ? parseFloat(e.balance_prev) : null;
      if (prev !== null && prev !== 0) {
        const variance = Math.abs(bal - prev) / Math.abs(prev);
        if (variance > 0.20) {
          const pct = (variance * 100).toFixed(1);
          candidates.push({
            title: `Variazione significativa: ${e.account_name}`,
            description: `La voce "${e.account_name}" (cod. ${e.account_code || 'N/A'}) ha una variazione del ${pct}% rispetto al periodo precedente (da ${prev.toFixed(2)} a ${bal.toFixed(2)}).`,
            severity: variance > 0.50 ? 'alta' : 'media',
          });
        }
      }
    }

    // Se non ci sono variazioni, evidenzia le prime voci per saldo assoluto più alto
    if (candidates.length === 0) {
      const sorted = [...entries].sort((a, b) => Math.abs(parseFloat(b.balance) || 0) - Math.abs(parseFloat(a.balance) || 0));
      const topN = Math.max(1, Math.floor(sorted.length * 0.25));
      for (const e of sorted.slice(0, topN)) {
        candidates.push({
          title: `Voce da verificare: ${e.account_name}`,
          description: `La voce "${e.account_name}" (cod. ${e.account_code || 'N/A'}) presenta un saldo di ${(parseFloat(e.balance) || 0).toFixed(2)}.`,
          severity: 'bassa',
        });
      }
    }

    const AUDIT_SERVICE_URL = process.env.AUDIT_SERVICE_URL || 'http://audit-service:3005';
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    let created = 0;
    for (const f of candidates) {
      try {
        const r = await fetch(`${AUDIT_SERVICE_URL}/api/audit/findings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ quarter_id: record.quarter_id, title: f.title, description: f.description, severity: f.severity }),
        });
        if (r.ok) created++;
        else console.warn('generateRilievi: finding non creato →', r.status);
      } catch (err) {
        console.warn('generateRilievi: audit-service non raggiungibile:', err.message);
      }
    }

    const message = created > 0
      ? `${created} ${created === 1 ? 'rilievo generato' : 'rilievi generati'} automaticamente.`
      : 'Nessun rilievo significativo rilevato.';
    return res.json({ created, message });
  } catch (err) {
    console.error('generateRilievi error:', err);
    return res.status(500).json({ error: 'Errore generazione rilievi.' });
  }
}

module.exports = { createImport, listImports, getImport, listEntries, updateEntry, deleteImport, aiPreview, getAnalisi, postAnalisi, generateRilievi };
