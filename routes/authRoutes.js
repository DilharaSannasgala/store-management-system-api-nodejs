const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Health check for auth routes
router.get('/status', (req, res) => {
    res.json({ status: 'Auth routes operational' });
});

// Signup route
router.post('/signup', authController.signup);

// Sign-in route
router.post('/signin', authController.signin);

// Forget Password route
router.post('/forget-password', authController.forgetPassword);

// Reset Password route
router.post('/reset-password/:token', authController.resetPassword);

// Verify token route
router.get('/verify-token', authController.verifyToken);

module.exports = router;