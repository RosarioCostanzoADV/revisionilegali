const express = require('express');
const router  = express.Router();
const mapBilancioRoutes = require('./mapBilancioRoutes');
const riscontroRoutes = require('./riscontroRoutes');
const commentoRoutes = require('./commentoRoutes');

// Health check — obbligatorio in ogni servizio
router.get('/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'ai-service' });
});

router.use('/map-bilancio', mapBilancioRoutes);
router.use('/riscontro-bilancio', riscontroRoutes);
router.use('/commento-revisione', commentoRoutes);

module.exports = router;
