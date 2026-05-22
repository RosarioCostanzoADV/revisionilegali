const express = require('express');
const router  = express.Router();
const mapBilancioRoutes = require('./mapBilancioRoutes');

// Health check — obbligatorio in ogni servizio
router.get('/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'ai-service' });
});

router.use('/map-bilancio', mapBilancioRoutes);

module.exports = router;
