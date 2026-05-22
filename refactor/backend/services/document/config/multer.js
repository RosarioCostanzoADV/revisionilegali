'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const STORAGE_ROOT = process.env.STORAGE_PATH || '/app/storage';

const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'text/csv',
]);

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(STORAGE_ROOT, req.user.tenant_id, req.body.quarter_id || 'unknown');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const { v4: uuidv4 } = require('uuid');
        const ext = path.extname(file.originalname) || '.bin';
        cb(null, `${uuidv4()}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo file non supportato.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_SIZE }
});

module.exports = { upload, STORAGE_ROOT };
