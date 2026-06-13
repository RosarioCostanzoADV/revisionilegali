'use strict';

const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../config/multer');
const {
    listDocuments,
    uploadDocument,
    renameDocument,
    downloadDocument,
    previewDocument,
    deleteDocument,
    copyDocuments,
} = require('../controllers/documentsController');

router.get('/', authenticateToken, listDocuments);
router.post('/copy', authenticateToken, copyDocuments);
router.post('/', authenticateToken, upload.single('file'), uploadDocument);
router.patch('/:id', authenticateToken, renameDocument);
router.get('/:id/download', authenticateToken, downloadDocument);
router.get('/:id/preview', authenticateToken, previewDocument);
router.delete('/:id', authenticateToken, deleteDocument);

module.exports = router;
