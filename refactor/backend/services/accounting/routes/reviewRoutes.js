'use strict';

const router = require('express').Router();
const { getReview, postReview } = require('../controllers/reviewController');

// GET  /api/accounting/review/:quarterId — ultimo report salvato, nessun ricalcolo
// POST /api/accounting/review/:quarterId — ricalcola da capo e salva
router.get('/:quarterId', getReview);
router.post('/:quarterId', postReview);

module.exports = router;
