'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getQuarter, updateQuarter } = require('../controllers/quartersController');

router.use(authenticateToken);

router.get('/:id', getQuarter);
router.patch('/:id', updateQuarter);

module.exports = router;
