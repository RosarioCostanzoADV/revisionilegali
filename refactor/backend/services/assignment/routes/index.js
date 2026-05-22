const express = require('express');
const router  = express.Router();

// Health check — obbligatorio in ogni servizio
router.get('/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'assignment-service' });
});

const assignmentsRoutes = require('./assignmentsRoutes');
const quartersRoutes = require('./quartersRoutes');
// Health alias per l'API gateway (/api/assignments/health)
router.get('/assignments/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || 'assignment-service' });
});

router.use('/assignments', assignmentsRoutes);
router.use('/quarters', quartersRoutes);

module.exports = router;
