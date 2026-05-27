'use strict';

const { Tenant, Plan } = require('../models');

// GET /api/tenants  (solo super_admin)
const listTenants = async (req, res) => {
    try {
        const tenants = await Tenant.findAll({
            include: [{ model: Plan, as: 'plan', attributes: ['id', 'name'] }],
            order: [['created_at', 'DESC']]
        });
        return res.json(tenants);
    } catch (err) {
        console.error('listTenants error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// GET /api/tenants/:id
const getTenant = async (req, res) => {
    try {
        // tenant_owner può vedere solo il proprio tenant
        if (req.user.role === 'tenant_owner' && req.user.tenant_id !== req.params.id) {
            return res.sendStatus(403);
        }

        const tenant = await Tenant.findByPk(req.params.id, {
            include: [{ model: Plan, as: 'plan' }]
        });
        if (!tenant) return res.status(404).json({ error: 'Tenant non trovato' });
        return res.json(tenant);
    } catch (err) {
        console.error('getTenant error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// GET /api/tenants/:id/status  — usato dal middleware del frontend
const getTenantStatus = async (req, res) => {
    try {
        const tenant = await Tenant.findByPk(req.params.id, {
            attributes: ['id', 'name', 'status', 'onboarding_completed', 'plan_id', 'plan_expires_at', 'referent_name', 'phone', 'vat_number', 'timezone'],
            include: [{ model: Plan, as: 'plan', attributes: ['id', 'name', 'max_assignments', 'max_users', 'vigilance_module', 'ai_drafts_module', 'advanced_import', 'ai_quota'] }]
        });
        if (!tenant) return res.status(404).json({ error: 'Tenant non trovato' });
        return res.json(tenant);
    } catch (err) {
        console.error('getTenantStatus error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/tenants  (solo super_admin)
const createTenant = async (req, res) => {
    try {
        const { name, referent_name, phone, vat_number, timezone, plan_id, plan_expires_at, status } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'name obbligatorio' });
        }

        const tenant = await Tenant.create({
            name,
            referent_name: referent_name || null,
            phone: phone || null,
            vat_number: vat_number || null,
            timezone: timezone || 'Europe/Rome',
            plan_id: plan_id || null,
            plan_expires_at: plan_expires_at || null,
            status: status || 'trial'
        });

        return res.status(201).json(tenant);
    } catch (err) {
        console.error('createTenant error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PUT /api/tenants/:id  (super_admin o tenant_owner del proprio tenant)
const updateTenant = async (req, res) => {
    try {
        if (req.user.role === 'tenant_owner' && req.user.tenant_id !== req.params.id) {
            return res.sendStatus(403);
        }

        const tenant = await Tenant.findByPk(req.params.id);
        if (!tenant) return res.status(404).json({ error: 'Tenant non trovato' });

        // tenant_owner può aggiornare solo campi non-amministrativi
        const allowedOwner = ['name', 'referent_name', 'phone', 'vat_number', 'timezone', 'logo_url'];
        const allowedAdmin = [...allowedOwner, 'status', 'plan_id', 'plan_expires_at'];
        const allowed = req.user.role === 'super_admin' ? allowedAdmin : allowedOwner;

        const updates = {};
        for (const field of allowed) {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        }

        await tenant.update(updates);
        return res.json(tenant);
    } catch (err) {
        console.error('updateTenant error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/tenants/onboarding
const completeOnboarding = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        if (!tenantId) return res.status(400).json({ error: 'Nessun tenant associato all\'utente' });

        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant) return res.status(404).json({ error: 'Tenant non trovato' });

        const { name, referent_name, phone, vat_number, timezone } = req.body;
        const updates = { onboarding_completed: true };
        if (name) updates.name = name;
        if (referent_name) updates.referent_name = referent_name;
        if (phone) updates.phone = phone;
        if (vat_number) updates.vat_number = vat_number;
        if (timezone) updates.timezone = timezone;

        await tenant.update(updates);
        return res.json(tenant);
    } catch (err) {
        console.error('completeOnboarding error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = { listTenants, getTenant, getTenantStatus, createTenant, updateTenant, completeOnboarding };
