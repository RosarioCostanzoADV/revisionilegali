'use strict';
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token mancante' });

    jwt.verify(token, process.env.JWT_SECRET || 'change_me_in_production', (err, user) => {
        if (err) return res.status(403).json({ error: 'Token non valido' });
        if (!user.tenant_id) return res.status(403).json({ error: 'tenant_id mancante nel token' });
        req.user = user;
        next();
    });
};

const requireSuperAdmin = (req, res, next) => {
    if (req.user?.role !== 'super_admin') {
        return res.status(403).json({ error: 'Accesso riservato a super_admin' });
    }
    next();
};

module.exports = { authenticateToken, requireSuperAdmin };
