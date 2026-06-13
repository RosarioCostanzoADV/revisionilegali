'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { listAssignments, getAssignment, createAssignment, updateAssignment, listQuarters, getPreviousAssignment } = require('../controllers/assignmentsController');
const { getCategoryFlags, setCategoryFlag } = require('../controllers/categoryFlagsController');

router.use(authenticateToken);

router.get('/', listAssignments);
router.post('/', createAssignment);
router.get('/:id', getAssignment);
router.patch('/:id', updateAssignment);
router.get('/:id/quarters', listQuarters);
router.get('/:id/previous', getPreviousAssignment);
router.get('/:id/category-flags', getCategoryFlags);
router.put('/:id/category-flags/:slug', setCategoryFlag);

module.exports = router;
