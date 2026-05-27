const express = require('express');
const router  = express.Router();

// Health check — obbligatorio in ogni servizio
router.get('/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'company-service' });
});

const companiesRoutes = require('./companiesRoutes');
// Health alias per l'API gateway (/api/companies/health)
router.get('/companies/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'company-service' });
});

router.use('/companies', companiesRoutes);

module.exports = router;
