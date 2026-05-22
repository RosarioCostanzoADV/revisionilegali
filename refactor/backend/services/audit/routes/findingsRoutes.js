'use strict';

const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const { listFindings, getFinding, createFinding, updateFinding } = require('../controllers/findingsController');

router.get('/', authenticateToken, listFindings);
router.post('/', authenticateToken, createFinding);
router.get('/:id', authenticateToken, getFinding);
router.patch('/:id', authenticateToken, updateFinding);

module.exports = router;
