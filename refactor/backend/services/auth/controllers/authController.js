'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { UserProfile, PasswordResetToken } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const RESET_TOKEN_EXPIRES_HOURS = 2;

function signToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            tenant_id: user.tenant_id
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

// POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email e password obbligatorie' });
        }

        const user = await UserProfile.findOne({ where: { email: email.toLowerCase().trim() } });

        if (!user || !user.is_active) {
            return res.status(401).json({ error: 'Credenziali non valide' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Credenziali non valide' });
        }

        const token = signToken(user);

        return res.json({
            access_token: token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                tenant_id: user.tenant_id,
                is_active: user.is_active
            }
        });
    } catch (err) {
        console.error('login error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/auth/logout
const logout = async (req, res) => {
    // JWT stateless: il client elimina il token.
    // In futuro: blacklist token con Redis.
    return res.json({ message: 'Logout effettuato' });
};

// GET /api/auth/verify
const verify = async (req, res) => {
    // Il middleware authenticateToken ha già validato il token → req.user è popolato
    return res.json({ valid: true, user: req.user });
};

// GET /api/auth/me
const getMe = async (req, res) => {
    try {
        const user = await UserProfile.findByPk(req.user.id, {
            attributes: { exclude: ['password_hash'] }
        });
        if (!user) return res.status(404).json({ error: 'Utente non trovato' });
        return res.json(user);
    } catch (err) {
        console.error('getMe error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PUT /api/auth/me
const updateMe = async (req, res) => {
    try {
        const allowed = ['full_name', 'phone', 'signature_text'];
        const updates = {};
        for (const field of allowed) {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        }

        const [, [updated]] = await UserProfile.update(updates, {
            where: { id: req.user.id },
            returning: true
        });

        if (!updated) return res.status(404).json({ error: 'Utente non trovato' });

        const { password_hash: _, ...safe } = updated.toJSON();
        return res.json(safe);
    } catch (err) {
        console.error('updateMe error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/auth/reset-password
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email obbligatoria' });

        const user = await UserProfile.findOne({ where: { email: email.toLowerCase().trim() } });

        // Risposta identica sia se l'utente esiste o meno (evita user enumeration)
        if (!user || !user.is_active) {
            return res.json({ message: 'Se l\'email è registrata riceverai un link di reset' });
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const token_hash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expires_at = new Date(Date.now() + RESET_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000);

        await PasswordResetToken.create({ user_id: user.id, token_hash, expires_at });

        // TODO: inviare email con link contenente rawToken
        // Per ora log in dev
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEV] Reset token per ${email}: ${rawToken}`);
        }

        return res.json({ message: 'Se l\'email è registrata riceverai un link di reset' });
    } catch (err) {
        console.error('requestPasswordReset error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/auth/update-password
const updatePassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ error: 'Token e password obbligatori' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'La password deve avere almeno 8 caratteri' });
        }

        const token_hash = crypto.createHash('sha256').update(token).digest('hex');
        const record = await PasswordResetToken.findOne({
            where: { token_hash },
            include: [{ model: UserProfile, as: 'user' }]
        });

        if (!record || record.used_at || record.expires_at < new Date()) {
            return res.status(400).json({ error: 'Token non valido o scaduto' });
        }

        const password_hash = await bcrypt.hash(password, 12);
        await record.user.update({ password_hash });
        await record.update({ used_at: new Date() });

        return res.json({ message: 'Password aggiornata con successo' });
    } catch (err) {
        console.error('updatePassword error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = { login, logout, verify, getMe, updateMe, requestPasswordReset, updatePassword };
