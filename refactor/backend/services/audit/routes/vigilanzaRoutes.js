'use strict';

const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const { listVigilanzaItems, createVigilanzaItem, updateVigilanzaItem, deleteVigilanzaItem } = require('../controllers/vigilanzaController');

router.get('/', authenticateToken, listVigilanzaItems);
router.post('/', authenticateToken, createVigilanzaItem);
router.patch('/:id', authenticateToken, updateVigilanzaItem);
router.delete('/:id', authenticateToken, deleteVigilanzaItem);

module.exports = router;
