const express = require('express');
const router  = express.Router();

// Health check — obbligatorio in ogni servizio
router.get('/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'template-service' });
});

const documentsRoutes = require('./documentsRoutes');
const draftsRoutes = require('./draftsRoutes');

router.use('/documents', documentsRoutes);
router.use('/drafts', draftsRoutes);

module.exports = router;
