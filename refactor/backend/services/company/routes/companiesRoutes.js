'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    listCompanies,
    getCompany,
    createCompany,
    updateCompany,
    archiveCompany
} = require('../controllers/companiesController');

// Tutte le route richiedono autenticazione
router.use(authenticateToken);

router.get('/', listCompanies);
router.get('/:id', getCompany);
router.post('/', createCompany);
router.patch('/:id', updateCompany);
router.delete('/:id', archiveCompany);

module.exports = router;
