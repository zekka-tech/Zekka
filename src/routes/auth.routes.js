const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/forgot-password', authLimiter, authController.forgotPassword);

router.get('/me', authenticate, authController.me);
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, authController.changePassword);

router.use((error, req, res, next) => {
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
