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
} = require('../controllers/importsController');

// Import job CRUD
router.get('/', listImports);
router.post('/', upload, createImport);
router.get('/:id', getImport);
router.get('/:id/entries', listEntries);
router.delete('/:id', deleteImport);

// Aggiornamento singola voce (mappatura AI)
router.patch('/entries/:entryId', updateEntry);

module.exports = router;
