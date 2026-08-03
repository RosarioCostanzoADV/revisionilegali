const express = require('express');
const router  = express.Router();
const { authenticateToken } = require('../middleware/auth');
const importsRoutes = require('./importsRoutes');
const reviewRoutes = require('./reviewRoutes');
const saluteNoteRoutes = require('./saluteNoteRoutes');
const riscontroNoteRoutes = require('./riscontroNoteRoutes');
const cartaLavoroRoutes = require('./cartaLavoroRoutes');

// Health check — obbligatorio in ogni servizio
router.get('/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'accounting-service' });
});

// Health alias per l'API gateway (/api/accounting/health)
router.get('/accounting/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'accounting-service' });
});

router.use('/accounting/imports', authenticateToken, importsRoutes);
router.use('/accounting/review', authenticateToken, reviewRoutes);
router.use('/accounting/salute-note', authenticateToken, saluteNoteRoutes);
router.use('/accounting/riscontro-note', authenticateToken, riscontroNoteRoutes);
router.use('/accounting/carta-lavoro', authenticateToken, cartaLavoroRoutes);

module.exports = router;
