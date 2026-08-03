'use strict';

const router = require('express').Router();
const { authenticateInternal } = require('../middleware/auth');
const { riscontroBilancio } = require('../controllers/riscontroController');

// Endpoint interno — richiede X-Internal-Token header
router.post('/', authenticateInternal, riscontroBilancio);

module.exports = router;
