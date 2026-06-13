'use strict';

const { AssignmentCategoryFlag, Assignment } = require('../models');

// GET /api/assignments/:id/category-flags
const getCategoryFlags = async (req, res) => {
    try {
        const assignment = await Assignment.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id },
            attributes: ['id']
        });
        if (!assignment) return res.status(404).json({ error: 'Incarico non trovato' });

        const flags = await AssignmentCategoryFlag.findAll({
            where: { assignment_id: req.params.id, tenant_id: req.user.tenant_id },
            attributes: ['category_slug', 'is_na']
        });

        return res.json(flags);
    } catch (err) {
        console.error('getCategoryFlags error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

// PUT /api/assignments/:id/category-flags/:slug
const setCategoryFlag = async (req, res) => {
    try {
        const assignment = await Assignment.findOne({
            where: { id: req.params.id, tenant_id: req.user.tenant_id },
            attributes: ['id']
        });
        if (!assignment) return res.status(404).json({ error: 'Incarico non trovato' });

        const { is_na } = req.body;
        if (typeof is_na !== 'boolean') {
            return res.status(400).json({ error: 'is_na deve essere boolean' });
        }

        let flag = await AssignmentCategoryFlag.findOne({
            where: {
                assignment_id: req.params.id,
                tenant_id: req.user.tenant_id,
                category_slug: req.params.slug,
            }
        });

        if (flag) {
            await flag.update({ is_na });
        } else {
            flag = await AssignmentCategoryFlag.create({
                assignment_id: req.params.id,
                tenant_id: req.user.tenant_id,
                category_slug: req.params.slug,
                is_na,
            });
        }

        return res.json({ category_slug: flag.category_slug, is_na: flag.is_na });
    } catch (err) {
        console.error('setCategoryFlag error:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = { getCategoryFlags, setCategoryFlag };
