'use strict';

const path = require('path');
const fs = require('fs');
const { Document } = require('../models');
const { STORAGE_ROOT } = require('../config/multer');

// GET /api/documents?quarter_id=...
const listDocuments = async (req, res) => {
    try {
        const { quarter_id } = req.query;
        if (!quarter_id) return res.status(400).json({ error: 'quarter_id obbligatorio' });

        const docs = await Document.findAll({
            where: { quarter_id, tenant_id: req.user.tenant_id },
            attributes: ['id', 'name', 'file_path', 'file_size', 'mime_type', 'category', 'notes', 'uploaded_by', 'created_at'],
            order: [['created_at', 'DESC']]
        });
        return res.json(docs);
    } catch (err) {
        console.error('listDocuments error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/documents  — multipart/form-data, gestito da multer prima del controller
const uploadDocument = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'File obbligatorio' });

        const { quarter_id, category, name: customName, notes } = req.body;
        if (!quarter_id) {
            // Pulisce il file caricato
            fs.unlink(req.file.path, () => {});
            return res.status(400).json({ error: 'quarter_id obbligatorio' });
        }

        const relativePath = path.relative(STORAGE_ROOT, req.file.path).replace(/\\/g, '/');

        const doc = await Document.create({
            tenant_id: req.user.tenant_id,
            quarter_id,
            name: customName?.trim() || req.file.originalname,
            file_path: relativePath,
            file_size: req.file.size,
            mime_type: req.file.mimetype,
            category: category || 'altro',
            notes: notes || null,
            uploaded_by: req.user.id || null
        });

        return res.status(201).json({ id: doc.id });
    } catch (err) {
        // Pulisce il file se il DB fallisce
        if (req.file?.path) fs.unlink(req.file.path, () => {});
        console.error('uploadDocument error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// GET /api/documents/:id/download  — restituisce il file con header corretti
const downloadDocument = async (req, res) => {
    try {
        const doc = await Document.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        if (!doc) return res.status(404).json({ error: 'Documento non trovato' });

        const absolutePath = path.join(STORAGE_ROOT, doc.file_path);
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ error: 'File non trovato su disco' });
        }

        res.setHeader('Content-Type', doc.mime_type);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.name)}"`);
        res.setHeader('Content-Length', doc.file_size);
        return res.sendFile(absolutePath);
    } catch (err) {
        console.error('downloadDocument error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// DELETE /api/documents/:id
const deleteDocument = async (req, res) => {
    try {
        const doc = await Document.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        if (!doc) return res.status(404).json({ error: 'Documento non trovato' });

        const absolutePath = path.join(STORAGE_ROOT, doc.file_path);
        await doc.destroy();

        // Cancella file da disco (best-effort, non bloccante)
        fs.unlink(absolutePath, (err) => {
            if (err) console.warn('deleteDocument: impossibile rimuovere file da disco:', err.message);
        });

        return res.json({ ok: true });
    } catch (err) {
        console.error('deleteDocument error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = { listDocuments, uploadDocument, downloadDocument, deleteDocument };
