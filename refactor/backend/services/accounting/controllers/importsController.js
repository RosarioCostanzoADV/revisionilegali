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
  const { AccountingImport } = req.app.locals.db;
  const tenantId = req.user.tenant_id;

  try {
    const record = await AccountingImport.findOne({
      where: { id: req.params.id, tenant_id: tenantId },
    });
    if (!record) return res.status(404).json({ error: 'Import non trovato.' });

    await record.destroy(); // CASCADE elimina anche le entries
    res.status(204).send();
  } catch (err) {
    console.error('deleteImport error:', err);
    res.status(500).json({ error: 'Errore eliminazione import.' });
  }
}

module.exports = { createImport, listImports, getImport, listEntries, updateEntry, deleteImport };
