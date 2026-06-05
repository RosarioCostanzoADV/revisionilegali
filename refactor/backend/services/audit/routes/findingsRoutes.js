'use strict';

const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const { listFindings, getFinding, createFinding, updateFinding, deleteFinding } = require('../controllers/findingsController');

router.get('/', authenticateToken, listFindings);
router.post('/', authenticateToken, createFinding);
router.get('/:id', authenticateToken, getFinding);
router.patch('/:id', authenticateToken, updateFinding);
router.delete('/:id', authenticateToken, deleteFinding);

module.exports = router;
