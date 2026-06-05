'use strict';

const router = require('express').Router();
const { upload } = require('../config/multer');
const {
  createImport,
  listImports,
  getImport,
  listEntries,
  updateEntry,
  deleteImport,
  aiPreview,
  getAnalisi,
  postAnalisi,
  generateRilievi,
} = require('../controllers/importsController');

// AI preview (parse + map senza salvare) — deve stare prima di /:id
router.post('/ai-preview', upload, aiPreview);

// Analisi aree di rischio + generazione carte di lavoro — prima di /:id
router.get('/:id/analisi', getAnalisi);
router.post('/:id/analisi', postAnalisi);

// Import job CRUD
// Generazione rilievi automatici da voci — prima di /:id
router.post('/:id/rilievi', generateRilievi);

router.get('/', listImports);
router.post('/', upload, createImport);
router.get('/:id', getImport);
router.get('/:id/entries', listEntries);
router.delete('/:id', deleteImport);

// Aggiornamento singola voce (mappatura AI)
router.patch('/entries/:entryId', updateEntry);

module.exports = router;
