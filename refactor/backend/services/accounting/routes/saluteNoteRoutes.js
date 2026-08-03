'use strict';

const router = require('express').Router();
const { listSaluteNote, upsertSaluteNota, deleteSaluteNota } = require('../controllers/saluteNoteController');

router.get('/', listSaluteNote);
router.put('/', upsertSaluteNota);
router.delete('/:id', deleteSaluteNota);

module.exports = router;
