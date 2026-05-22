'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { listAssignments, getAssignment, createAssignment, updateAssignment, listQuarters } = require('../controllers/assignmentsController');

router.use(authenticateToken);

router.get('/', listAssignments);
router.post('/', createAssignment);
router.get('/:id', getAssignment);
router.patch('/:id', updateAssignment);
router.get('/:id/quarters', listQuarters);

module.exports = router;
