'use strict';

const { VigilanzaItem } = require('../models');

// Template standard checklist di vigilanza trimestrale (copiato dal frontend originale)
const TEMPLATE_ITEMS = [
    // Contabilità e amministrazione
    { item: 'Verifica tenuta della contabilità sociale', category: 'contabilità', sort_order: 1 },
    { item: 'Verifica corretta applicazione dei principi contabili', category: 'contabilità', sort_order: 2 },
    { item: 'Verifica regolarità dei libri contabili obbligatori', category: 'contabilità', sort_order: 3 },
    // Amministrazione e governance
    { item: 'Verifica rispetto dei principi di corretta amministrazione', category: 'governance', sort_order: 10 },
    { item: 'Verifica adeguatezza assetto organizzativo, amministrativo e contabile', category: 'governance', sort_order: 11 },
    { item: 'Verifica rispetto della legge e dell\'atto costitutivo', category: 'governance', sort_order: 12 },
    { item: 'Verifica verbali riunioni organo amministrativo (se disponibili)', category: 'governance', sort_order: 13 },
    { item: 'Verifica operazioni di rilievo e operazioni straordinarie', category: 'governance', sort_order: 14 },
    { item: 'Verifica rapporti con parti correlate', category: 'governance', sort_order: 15 },
    // Adempimenti
    { item: 'Verifica assolvimento obblighi tributari (IVA, F24, dichiarazioni)', category: 'adempimenti', sort_order: 20 },
    { item: 'Verifica adempimenti previdenziali e contributivi', category: 'adempimenti', sort_order: 21 },
    { item: 'Verifica scadenze deposito atti e bilancio (se applicabile)', category: 'adempimenti', sort_order: 22 },
    // Controllo interno
    { item: 'Verifica adeguatezza del sistema di controllo interno', category: 'controllo_interno', sort_order: 30 },
    { item: 'Verifica procedure antiriciclaggio (se applicabile)', category: 'controllo_interno', sort_order: 31 },
];

// GET /api/vigilanza?quarter_id=...
const listVigilanzaItems = async (req, res) => {
    try {
        const { quarter_id } = req.query;
        if (!quarter_id) return res.status(400).json({ error: 'quarter_id obbligatorio' });

        const items = await VigilanzaItem.findAll({
            where: { quarter_id, tenant_id: req.user.tenant_id },
            attributes: ['id', 'item', 'category', 'done', 'notes', 'completed_by', 'completed_at', 'sort_order'],
            order: [['sort_order', 'ASC'], ['created_at', 'ASC']]
        });
        return res.json(items);
    } catch (err) {
        console.error('listVigilanzaItems error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/vigilanza  — crea singolo item o carica template
const createVigilanzaItem = async (req, res) => {
    try {
        const { quarter_id, load_template, item, category, sort_order } = req.body;

        if (!quarter_id) return res.status(400).json({ error: 'quarter_id obbligatorio' });

        // Caricamento template standard
        if (load_template) {
            const existing = await VigilanzaItem.findOne({
                where: { quarter_id, tenant_id: req.user.tenant_id },
                attributes: ['id']
            });
            if (existing) {
                return res.status(409).json({ error: 'Checklist già presente per questo trimestre.' });
            }

            await VigilanzaItem.bulkCreate(
                TEMPLATE_ITEMS.map(t => ({
                    ...t,
                    quarter_id,
                    tenant_id: req.user.tenant_id
                }))
            );
            return res.json({ ok: true, count: TEMPLATE_ITEMS.length });
        }

        // Creazione singolo item
        if (!item || item.trim().length === 0) return res.status(400).json({ error: 'item obbligatorio' });

        const vigilanzaItem = await VigilanzaItem.create({
            tenant_id: req.user.tenant_id,
            quarter_id,
            item: item.trim(),
            category: category || 'generale',
            sort_order: sort_order != null ? sort_order : 99
        });

        return res.status(201).json({ id: vigilanzaItem.id });
    } catch (err) {
        console.error('createVigilanzaItem error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PATCH /api/vigilanza/:id
const updateVigilanzaItem = async (req, res) => {
    try {
        const vigilanzaItem = await VigilanzaItem.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        if (!vigilanzaItem) return res.status(404).json({ error: 'Voce vigilanza non trovata' });

        const updates = {};
        if ('done' in req.body) {
            updates.done = req.body.done;
            if (req.body.done === true) {
                updates.completed_by = req.user.id;
                updates.completed_at = new Date();
            } else {
                updates.completed_by = null;
                updates.completed_at = null;
            }
        }
        if ('notes' in req.body) updates.notes = req.body.notes;
        if ('item' in req.body) {
            if (!req.body.item || !String(req.body.item).trim()) {
                return res.status(400).json({ error: 'item non può essere vuoto' });
            }
            updates.item = req.body.item;
        }

        await vigilanzaItem.update(updates);
        return res.json({ ok: true });
    } catch (err) {
        console.error('updateVigilanzaItem error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// DELETE /api/vigilanza/:id
const deleteVigilanzaItem = async (req, res) => {
    try {
        const item = await VigilanzaItem.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        if (!item) return res.status(404).json({ error: 'Elemento non trovato' });
        await item.destroy();
        return res.json({ ok: true });
    } catch (err) {
        console.error('deleteVigilanzaItem error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = { listVigilanzaItems, createVigilanzaItem, updateVigilanzaItem, deleteVigilanzaItem };
