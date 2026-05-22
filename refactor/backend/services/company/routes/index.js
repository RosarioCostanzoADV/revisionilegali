const express = require('express');
const router  = express.Router();

// Health check — obbligatorio in ogni servizio
router.get('/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'company-service' });
});

const companiesRoutes = require('./companiesRoutes');
router.use('/companies', companiesRoutes);

module.exports = router;
