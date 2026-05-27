'use strict';

const bcrypt = require('bcryptjs');
const { UserProfile } = require('../models');

// GET /api/auth/users  (super_admin o tenant_owner)
const listUsers = async (req, res) => {
    try {
        const where = {};
        // tenant_owner vede solo gli utenti del proprio tenant
        if (req.user.role === 'tenant_owner') {
            where.tenant_id = req.user.tenant_id;
        }

        const users = await UserProfile.findAll({
            where,
            attributes: { exclude: ['password_hash'] },
            order: [['created_at', 'DESC']]
        });

        return res.json(users);
    } catch (err) {
        console.error('listUsers error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/auth/users  (super_admin o tenant_owner)
const createUser = async (req, res) => {
    try {
        const { email, password, full_name, phone, role, tenant_id } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ error: 'Email, password e ruolo obbligatori' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'La password deve avere almeno 8 caratteri' });
        }

        const validRoles = ['super_admin', 'tenant_owner', 'revisor', 'collaborator', 'syndic'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Ruolo non valido' });
        }

        // tenant_owner può creare solo utenti del proprio tenant con ruoli non-admin
        if (req.user.role === 'tenant_owner') {
            if (['super_admin', 'tenant_owner'].includes(role)) {
                return res.status(403).json({ error: 'Non autorizzato a creare questo ruolo' });
            }
            // Forza il tenant_id al proprio tenant
            req.body.tenant_id = req.user.tenant_id;
        }

        const existing = await UserProfile.findOne({ where: { email: email.toLowerCase().trim() } });
        if (existing) {
            return res.status(409).json({ error: 'Email già registrata' });
        }

        const password_hash = await bcrypt.hash(password, 12);

        const user = await UserProfile.create({
            email: email.toLowerCase().trim(),
            password_hash,
            full_name: full_name || null,
            phone: phone || null,
            role,
            tenant_id: req.body.tenant_id || tenant_id || null
        });

        const { password_hash: _, ...safe } = user.toJSON();
        return res.status(201).json(safe);
    } catch (err) {
        console.error('createUser error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PUT /api/auth/users/:id  (super_admin o tenant_owner)
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await UserProfile.findByPk(id);

        if (!user) return res.status(404).json({ error: 'Utente non trovato' });

        // tenant_owner può modificare solo utenti del proprio tenant
        if (req.user.role === 'tenant_owner' && user.tenant_id !== req.user.tenant_id) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        const allowed = ['full_name', 'phone', 'signature_text', 'role', 'is_active'];
        const updates = {};
        for (const field of allowed) {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        }

        if (req.body.password) {
            if (req.body.password.length < 8) {
                return res.status(400).json({ error: 'La password deve avere almeno 8 caratteri' });
            }
            updates.password_hash = await bcrypt.hash(req.body.password, 12);
        }

        await user.update(updates);

        const { password_hash: _, ...safe } = user.toJSON();
        return res.json(safe);
    } catch (err) {
        console.error('updateUser error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// DELETE /api/auth/users/:id  — soft delete (is_active = false)
const deactivateUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.user.id) {
            return res.status(400).json({ error: 'Non puoi disattivare il tuo account' });
        }

        const user = await UserProfile.findByPk(id);
        if (!user) return res.status(404).json({ error: 'Utente non trovato' });

        if (req.user.role === 'tenant_owner' && user.tenant_id !== req.user.tenant_id) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        await user.update({ is_active: false });
        return res.json({ message: 'Utente disattivato' });
    } catch (err) {
        console.error('deactivateUser error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = { listUsers, createUser, updateUser, deactivateUser };
