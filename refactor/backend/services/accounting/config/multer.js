'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { parseCSV, parseSpreadsheet, parsePDF } = require('../lib/parsers');

const STORAGE_ROOT = process.env.STORAGE_ROOT || '/tmp/accounting_storage';
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

const ALLOWED_MIME = [
  'text/csv',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(STORAGE_ROOT, req.user.tenant_id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uuidv4() + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo di file non supportato. Usa CSV, XLSX o PDF.'));
    }
  },
}).single('file');

module.exports = { upload };
