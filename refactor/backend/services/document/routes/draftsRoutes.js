'use strict';

const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const { listDrafts, getDraft, createDraft, updateDraft, deleteDraft } = require('../controllers/draftsController');

router.get('/', authenticateToken, listDrafts);
router.post('/', authenticateToken, createDraft);
router.get('/:id', authenticateToken, getDraft);
router.patch('/:id', authenticateToken, updateDraft);
router.delete('/:id', authenticateToken, deleteDraft);

module.exports = router;
