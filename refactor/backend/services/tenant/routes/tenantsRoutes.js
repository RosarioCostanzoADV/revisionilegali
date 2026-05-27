'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');
const {
    listTenants,
    getTenant,
    getTenantStatus,
    createTenant,
    updateTenant,
    completeOnboarding
} = require('../controllers/tenantsController');

router.use(authenticateToken);

// Rotta pubblica (richiede solo JWT valido) — usata dal middleware frontend
router.get('/:id/status', getTenantStatus);

router.get('/', requireSuperAdmin, listTenants);
router.post('/', requireSuperAdmin, createTenant);
router.post('/onboarding', completeOnboarding);
router.get('/:id', getTenant);
router.put('/:id', updateTenant);

module.exports = router;
