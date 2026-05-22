const express = require('express');
const router  = express.Router();

// Health check — obbligatorio in ogni servizio
router.get('/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'auth-service' });
});

const authRoutes  = require('./authRoutes');
const usersRoutes = require('./usersRoutes');

router.use('/auth', authRoutes);
router.use('/auth/users', usersRoutes);

module.exports = router;
