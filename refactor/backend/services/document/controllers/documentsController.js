'use strict';

const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { Document } = require('../models');
const { STORAGE_ROOT } = require('../config/multer');

// GET /api/documents?quarter_id=...  OR  ?assignment_id=...
const listDocuments = async (req, res) => {
    try {
        const { quarter_id, assignment_id } = req.query;
        if (!quarter_id && !assignment_id) {
            return res.status(400).json({ error: 'quarter_id o assignment_id obbligatorio' });
        }

        const where = { tenant_id: req.user.tenant_id };
        if (assignment_id) where.assignment_id = assignment_id;
        else where.quarter_id = quarter_id;

        const docs = await Document.findAll({
            where,
            attributes: ['id', 'name', 'file_path', 'file_size', 'mime_type', 'category', 'notes', 'uploaded_by', 'assignment_id', 'quarter_id', 'created_at'],
            order: [['created_at', 'DESC']]
        });
        return res.json(docs);
    } catch (err) {
        console.error('listDocuments error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/documents  — multipart/form-data
const uploadDocument = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'File obbligatorio' });

        const { quarter_id, assignment_id, category, name: customName, notes } = req.body;
        if (!quarter_id && !assignment_id) {
            fs.unlink(req.file.path, () => {});
            return res.status(400).json({ error: 'quarter_id o assignment_id obbligatorio' });
        }

        const relativePath = path.relative(STORAGE_ROOT, req.file.path).replace(/\\/g, '/');

        const doc = await Document.create({
            tenant_id: req.user.tenant_id,
            quarter_id: quarter_id || null,
            assignment_id: assignment_id || null,
            name: customName?.trim() || req.file.originalname,
            file_path: relativePath,
            file_size: req.file.size,
            mime_type: req.file.mimetype,
            category: category || 'altro',
            notes: notes || null,
            uploaded_by: req.user.id || null,
            owns_file: true,
        });

        return res.status(201).json({ id: doc.id });
    } catch (err) {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
        console.error('uploadDocument error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PATCH /api/documents/:id  — rinomina
const renameDocument = async (req, res) => {
    try {
        const doc = await Document.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        if (!doc) return res.status(404).json({ error: 'Documento non trovato' });

        const { name } = req.body;
        if (!name?.trim()) return res.status(400).json({ error: 'name obbligatorio' });

        await doc.update({ name: name.trim() });
        return res.json({ ok: true });
    } catch (err) {
        console.error('renameDocument error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// GET /api/documents/:id/download
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

// GET /api/documents/:id/preview  — serve inline per anteprima nel browser
const previewDocument = async (req, res) => {
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
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.name)}"`);
        res.setHeader('Content-Length', doc.file_size);
        return res.sendFile(absolutePath);
    } catch (err) {
        console.error('previewDocument error:', err);
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
        const ownsFile = doc.owns_file !== false;
        await doc.destroy();

        if (ownsFile) {
            const otherRef = await Document.findOne({ where: { file_path: doc.file_path } });
            if (!otherRef) {
                fs.unlink(absolutePath, (err) => {
                    if (err) console.warn('deleteDocument: impossibile rimuovere file da disco:', err.message);
                });
            }
        }

        return res.json({ ok: true });
    } catch (err) {
        console.error('deleteDocument error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// POST /api/documents/copy  — copia documenti da un assignment precedente
const copyDocuments = async (req, res) => {
    try {
        const { doc_ids, target_assignment_id } = req.body;
        if (!Array.isArray(doc_ids) || !doc_ids.length) {
            return res.status(400).json({ error: 'doc_ids obbligatorio (array non vuoto)' });
        }
        if (!target_assignment_id) {
            return res.status(400).json({ error: 'target_assignment_id obbligatorio' });
        }

        const sourceDocs = await Document.findAll({
            where: { id: { [Op.in]: doc_ids }, tenant_id: req.user.tenant_id }
        });

        if (!sourceDocs.length) {
            return res.status(404).json({ error: 'Nessun documento trovato' });
        }

        const copies = await Document.bulkCreate(
            sourceDocs.map((d) => ({
                tenant_id: req.user.tenant_id,
                assignment_id: target_assignment_id,
                quarter_id: null,
                name: d.name,
                file_path: d.file_path,
                file_size: d.file_size,
                mime_type: d.mime_type,
                category: d.category,
                notes: d.notes,
                uploaded_by: req.user.id || null,
                owns_file: false,
            }))
        );

        return res.status(201).json({ ids: copies.map((c) => c.id) });
    } catch (err) {
        console.error('copyDocuments error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = { listDocuments, uploadDocument, renameDocument, downloadDocument, previewDocument, deleteDocument, copyDocuments };
