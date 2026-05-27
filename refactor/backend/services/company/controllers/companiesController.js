'use strict';

const { Company } = require('../models');

// Ruoli che possono creare/modificare aziende
const WRITER_ROLES = ['tenant_owner', 'revisor'];

// GET /api/companies
const listCompanies = async (req, res) => {
    try {
        const where = { tenant_id: req.user.tenant_id };

        // Mostra archiviate solo se esplicitamente richiesto
        if (req.query.archived !== 'true') {
            where.is_archived = false;
        }

        const companies = await Company.findAll({
            where,
            attributes: ['id', 'name', 'fiscal_code', 'vat_number', 'sector', 'city', 'province', 'is_archived', 'created_at'],
            order: [['name', 'ASC']]
        });
        return res.json(companies);
    } catch (err) {
        console.error('listCompanies error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// GET /api/companies/:id
const getCompany = async (req, res) => {
    try {
        const company = await Company.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        if (!company) return res.status(404).json({ error: 'Azienda non trovata' });
        return res.json(company);
    } catch (err) {
        console.error('getCompany error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/companies
const createCompany = async (req, res) => {
    try {
        if (!WRITER_ROLES.includes(req.user.role)) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        const { name, fiscal_code, vat_number, sector, address, city, province, notes } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({ error: 'name obbligatorio' });
        }
        if (name.length > 300) {
            return res.status(400).json({ error: 'name troppo lungo (max 300 caratteri)' });
        }

        const company = await Company.create({
            tenant_id: req.user.tenant_id,
            name: name.trim(),
            fiscal_code: fiscal_code || null,
            vat_number: vat_number || null,
            sector: sector || null,
            address: address || null,
            city: city || null,
            province: province || null,
            notes: notes || null
        });

        return res.status(201).json({ id: company.id });
    } catch (err) {
        console.error('createCompany error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PATCH /api/companies/:id
const updateCompany = async (req, res) => {
    try {
        if (!WRITER_ROLES.includes(req.user.role)) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        const company = await Company.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        if (!company) return res.status(404).json({ error: 'Azienda non trovata' });

        const allowed = ['name', 'fiscal_code', 'vat_number', 'sector', 'address', 'city', 'province', 'notes', 'is_archived'];
        const updates = {};
        for (const key of allowed) {
            if (key in req.body) {
                updates[key] = req.body[key];
            }
        }

        if (updates.name !== undefined && (typeof updates.name !== 'string' || updates.name.trim().length === 0)) {
            return res.status(400).json({ error: 'name non può essere vuoto' });
        }

        await company.update(updates);
        return res.json({ id: company.id });
    } catch (err) {
        console.error('updateCompany error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// DELETE /api/companies/:id  — soft delete (archivia)
const archiveCompany = async (req, res) => {
    try {
        if (!WRITER_ROLES.includes(req.user.role)) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        const company = await Company.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        if (!company) return res.status(404).json({ error: 'Azienda non trovata' });

        await company.update({ is_archived: true });
        return res.sendStatus(204);
    } catch (err) {
        console.error('archiveCompany error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = { listCompanies, getCompany, createCompany, updateCompany, archiveCompany };
