'use strict';

const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const { listWorkingPapers, getWorkingPaper, createWorkingPaper, updateWorkingPaper } = require('../controllers/workingPapersController');

router.get('/', authenticateToken, listWorkingPapers);
router.post('/', authenticateToken, createWorkingPaper);
router.get('/:id', authenticateToken, getWorkingPaper);
router.patch('/:id', authenticateToken, updateWorkingPaper);

module.exports = router;
