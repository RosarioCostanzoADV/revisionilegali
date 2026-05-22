'use strict';

const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../config/multer');
const { listDocuments, uploadDocument, downloadDocument, deleteDocument } = require('../controllers/documentsController');

router.get('/', authenticateToken, listDocuments);
router.post('/', authenticateToken, upload.single('file'), uploadDocument);
router.get('/:id/download', authenticateToken, downloadDocument);
router.delete('/:id', authenticateToken, deleteDocument);

module.exports = router;
