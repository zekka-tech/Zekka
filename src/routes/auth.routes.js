const express = require('express');
const authController = require('../controllers/auth.controller');
const { asyncHandler } = require('../middleware/error-handler.middleware');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', authLimiter, asyncHandler(authController.register));
router.post('/login', authLimiter, asyncHandler(authController.login));
router.post('/forgot-password', authLimiter, asyncHandler(authController.forgotPassword));
router.post('/refresh-token', authLimiter, asyncHandler(authController.refreshToken));
router.post('/reset-password', authLimiter, asyncHandler(authController.resetPassword));
router.post('/verify-email', authLimiter, asyncHandler(authController.verifyEmail));
router.post(
  '/resend-verification',
  authLimiter,
  asyncHandler(authController.resendVerificationEmail)
);

router.get('/me', authenticate, asyncHandler(authController.me));
router.post('/logout', authenticate, asyncHandler(authController.logout));
router.post('/change-password', authenticate, asyncHandler(authController.changePassword));

router.use((error, req, res, _next) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.isOperational === false ? undefined : error.code
    });
  }

  return res.status(500).json({
    error: error.message || 'Internal server error'
  });
});

module.exports = router;
