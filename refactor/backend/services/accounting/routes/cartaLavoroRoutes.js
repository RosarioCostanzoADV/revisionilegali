'use strict';

const router = require('express').Router();
const { getCartaLavoro, upsertCartaLavoro, deleteCartaLavoro } = require('../controllers/cartaLavoroController');

router.get('/:quarterId', getCartaLavoro);
router.put('/:quarterId', upsertCartaLavoro);
router.delete('/:quarterId', deleteCartaLavoro);

module.exports = router;
