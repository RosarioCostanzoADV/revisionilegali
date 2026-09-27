'use strict';

const router = require('express').Router();
const { authenticateInternal } = require('../middleware/auth');
const { verificaBilancio } = require('../controllers/verificaBilancioController');

// Endpoint interno — richiede X-Internal-Token header
router.post('/', authenticateInternal, verificaBilancio);

module.exports = router;
