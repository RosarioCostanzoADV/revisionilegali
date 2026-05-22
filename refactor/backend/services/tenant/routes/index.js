const express = require('express');
const router  = express.Router();

// Health check — obbligatorio in ogni servizio
router.get('/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'tenant-service' });
});

const plansRoutes   = require('./plansRoutes');
const tenantsRoutes = require('./tenantsRoutes');

// Health aliases per l'API gateway
router.get('/plans/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'tenant-service' });
});
router.get('/tenants/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'tenant-service' });
});

router.use('/plans', plansRoutes);
router.use('/tenants', tenantsRoutes);

module.exports = router;
