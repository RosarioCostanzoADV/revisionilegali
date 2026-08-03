'use strict';

const router = require('express').Router();
const { listRiscontroNote, upsertRiscontroNota, deleteRiscontroNota } = require('../controllers/riscontroNoteController');

router.get('/', listRiscontroNote);
router.put('/', upsertRiscontroNota);
router.delete('/:id', deleteRiscontroNota);

module.exports = router;
