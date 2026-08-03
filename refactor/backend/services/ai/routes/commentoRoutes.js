'use strict';

const router = require('express').Router();
const { authenticateInternal } = require('../middleware/auth');
const { commento } = require('../controllers/commentoController');

// Endpoint interno — richiede X-Internal-Token header
router.post('/', authenticateInternal, commento);

module.exports = router;
