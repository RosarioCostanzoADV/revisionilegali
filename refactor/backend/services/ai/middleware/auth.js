'use strict';
const jwt = require('jsonwebtoken');

// Verifica token JWT interno (chiamate inter-service)
const authenticateInternal = (req, res, next) => {
    const token = req.headers['x-internal-token'];
    if (!token || token !== (process.env.INTERNAL_SERVICE_TOKEN || 'change_me_in_production')) {
        return res.status(403).json({ error: 'Internal token richiesto.' });
    }
    next();
};

// Verifica token JWT utente standard
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
        if (err) return res.sendStatus(403);
        if (!user.tenant_id) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

module.exports = { authenticateToken, authenticateInternal };
