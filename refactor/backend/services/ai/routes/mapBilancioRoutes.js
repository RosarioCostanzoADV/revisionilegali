'use strict';

const router = require('express').Router();
const { authenticateInternal } = require('../middleware/auth');
const { mapBilancio, mapBilancioLocal } = require('../controllers/mapBilancioController');

// Endpoint interno — richiede X-Internal-Token header
router.post('/', authenticateInternal, mapBilancio);
router.post('/local', authenticateInternal, mapBilancioLocal);

module.exports = router;
