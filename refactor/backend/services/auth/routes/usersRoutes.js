'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { listUsers, createUser, updateUser, deactivateUser } = require('../controllers/usersController');

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/', listUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deactivateUser);

module.exports = router;
