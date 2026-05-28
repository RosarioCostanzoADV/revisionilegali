const jwt = require('jsonwebtoken');

const getTokenFromCookie = (cookieHeader) => {
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';');
    for (const rawCookie of cookies) {
        const cookie = rawCookie.trim();
        if (!cookie.startsWith('auth_token=')) continue;

        const value = cookie.slice('auth_token='.length);
        try {
            return decodeURIComponent(value);
        } catch {
            return value;
        }
    }

    return null;
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.split(' ')[1];
    const cookieToken = getTokenFromCookie(req.headers['cookie']);
    const token = bearerToken || cookieToken;

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'change_me_in_production', (err, user) => {
        if (err) return res.sendStatus(403);
        // Garantire che il token contenga tenant_id
        if (!user.tenant_id) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const requireSuperAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'super_admin') return res.sendStatus(403);
    next();
};

module.exports = { authenticateToken, requireSuperAdmin };
