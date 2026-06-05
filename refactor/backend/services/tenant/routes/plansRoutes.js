'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');
const { listPlans, getPlan, createPlan, updatePlan } = require('../controllers/plansController');

router.use(authenticateToken);

router.get('/', listPlans);
router.get('/:id', getPlan);
router.post('/', requireSuperAdmin, createPlan);
router.put('/:id', requireSuperAdmin, updatePlan);
router.patch('/:id', requireSuperAdmin, updatePlan);

module.exports = router;
