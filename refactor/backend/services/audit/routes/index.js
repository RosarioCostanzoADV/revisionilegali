const express = require('express');
const router  = express.Router();

// Health check — obbligatorio in ogni servizio
router.get('/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'template-service' });
});

const workingPapersRoutes = require('./workingPapersRoutes');
const findingsRoutes = require('./findingsRoutes');
const vigilanzaRoutes = require('./vigilanzaRoutes');

router.use('/working-papers', workingPapersRoutes);
router.use('/findings', findingsRoutes);
router.use('/vigilanza', vigilanzaRoutes);

module.exports = router;
