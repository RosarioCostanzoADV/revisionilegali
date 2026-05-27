const express = require('express');
const router  = express.Router();

// Health check — obbligatorio in ogni servizio
router.get('/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'template-service' });
});

const workingPapersRoutes = require('./workingPapersRoutes');
const findingsRoutes = require('./findingsRoutes');
const vigilanzaRoutes = require('./vigilanzaRoutes');

// Health alias per l'API gateway (/api/audit/health)
router.get('/audit/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'audit-service' });
});

router.use('/working-papers', workingPapersRoutes);
router.use('/findings', findingsRoutes);
router.use('/vigilanza', vigilanzaRoutes);

// Alias per l'API gateway (/api/audit/working-papers → /api/working-papers)
router.use('/audit/working-papers', workingPapersRoutes);
router.use('/audit/findings', findingsRoutes);
router.use('/audit/vigilanza', vigilanzaRoutes);

module.exports = router;
