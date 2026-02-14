const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { loginLimiter, registerLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

router.post('/register', registerLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.get('/reset-password/:token', authController.validateResetToken);
router.post('/reset-password/:token', authController.resetPassword);

router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.put('/change-password', authMiddleware, authController.changePassword);
router.post('/logout', authMiddleware, authController.logout);
router.post('/delete-account', authMiddleware, authController.deleteAccount);

router.get('/two-factor/status', authMiddleware, authController.checkTwoFactorStatus);
router.post('/two-factor/enable', authMiddleware, authController.enableTwoFactor);
router.post('/two-factor/disable', authMiddleware, authController.disableTwoFactor);
router.post('/two-factor/verify', authMiddleware, authController.verifyTwoFactorSetup);
router.post('/two-factor/resend-code', authController.resendTwoFactorCode);


module.exports = router;