const express = require('express');
const router  = express.Router();

// Health check — obbligatorio in ogni servizio
router.get('/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'tenant-service' });
});

const plansRoutes   = require('./plansRoutes');
const tenantsRoutes = require('./tenantsRoutes');

router.use('/plans', plansRoutes);
router.use('/tenants', tenantsRoutes);

module.exports = router;
