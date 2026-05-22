const express = require('express');
const router  = express.Router();
const { authenticateToken } = require('../middleware/auth');
const importsRoutes = require('./importsRoutes');

// Health check — obbligatorio in ogni servizio
router.get('/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'accounting-service' });
});

// Health alias per l'API gateway (/api/accounting/health)
router.get('/accounting/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'accounting-service' });
});

router.use('/imports', authenticateToken, importsRoutes);

module.exports = router;
