'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    login,
    logout,
    verify,
    getMe,
    updateMe,
    requestPasswordReset,
    updatePassword
} = require('../controllers/authController');

router.post('/login', login);
router.post('/logout', logout);
router.post('/reset-password', requestPasswordReset);
router.post('/update-password', updatePassword);
router.get('/verify', authenticateToken, verify);
router.get('/me', authenticateToken, getMe);
router.put('/me', authenticateToken, updateMe);

module.exports = router;
