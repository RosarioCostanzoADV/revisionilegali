const express = require('express');
const router  = express.Router();

// Health check — obbligatorio in ogni servizio
router.get('/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'template-service' });
});

// Registra qui le routes del servizio, es.:
// const itemRoutes = require('./itemRoutes');
// router.use('/items', itemRoutes);

module.exports = router;
