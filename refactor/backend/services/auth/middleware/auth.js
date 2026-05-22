const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'change_me_in_production', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (!req.user || !['super_admin', 'tenant_owner'].includes(req.user.role)) {
        return res.sendStatus(403);
    }
    next();
};

const requireSuperAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'super_admin') {
        return res.sendStatus(403);
    }
    next();
};

module.exports = { authenticateToken, requireAdmin, requireSuperAdmin };
