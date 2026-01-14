/**
 * Phase 6A: Social Authentication Routes
 * 
 * Provides authentication endpoints for:
 * - WhatsApp Business API
 * - Telegram Bot API
 * 
 * Features:
 * - OAuth-style authentication flows
 * - OTP (One-Time Password) verification
 * - Session management
 * - User profile retrieval
 * - Security best practices
 */

const express = require('express');
const router = express.Router();
const { Phase6AIntegrations } = require('../integrations/phase6a-integrations');
const { AuthService } = require('../services/auth.service');
const { AuditLogger } = require('../utils/audit-logger');
const crypto = require('crypto');

const integrations = new Phase6AIntegrations();
const authService = new AuthService();
const auditLogger = new AuditLogger();

// ============================================================
// WHATSAPP AUTHENTICATION
// ============================================================

/**
 * POST /api/auth/whatsapp/request-otp
 * Request OTP via WhatsApp
 */
router.post('/whatsapp/request-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Store OTP with expiration (5 minutes)
    const otpKey = `whatsapp:otp:${phoneNumber}`;
    await req.app.locals.cache.set(otpKey, otp, 300);

    // Send OTP via WhatsApp
    await integrations.callWhatsApp('messages', {
      method: 'POST',
      data: {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: {
          body: `Your Zekka verification code is: ${otp}\n\nThis code will expire in 5 minutes.`
        }
      }
    });

    await auditLogger.log({
      category: 'auth',
      action: 'whatsapp_otp_requested',
      details: { phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*') },
      severity: 'info',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'OTP sent via WhatsApp',
      expiresIn: 300 // seconds
    });

  } catch (error) {
    console.error('WhatsApp OTP request error:', error);
    
    await auditLogger.log({
      category: 'auth',
      action: 'whatsapp_otp_error',
      details: { error: error.message },
      severity: 'error',
      ipAddress: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Failed to send OTP'
    });
  }
});

/**
 * POST /api/auth/whatsapp/verify-otp
 * Verify OTP and create session
 */
router.post('/whatsapp/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and OTP are required'
      });
    }

    // Retrieve stored OTP
    const otpKey = `whatsapp:otp:${phoneNumber}`;
    const storedOTP = await req.app.locals.cache.get(otpKey);

    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        error: 'OTP expired or not found'
      });
    }

    if (storedOTP !== otp) {
      await auditLogger.log({
        category: 'auth',
        action: 'whatsapp_otp_invalid',
        details: { phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*') },
        severity: 'warning',
        ipAddress: req.ip
      });

      return res.status(400).json({
        success: false,
        error: 'Invalid OTP'
      });
    }

    // Delete used OTP
    await req.app.locals.cache.delete(otpKey);

    // Find or create user
    let user = await authService.findUserByPhone(phoneNumber);
    
    if (!user) {
      user = await authService.createUser({
        phone: phoneNumber,
        authMethod: 'whatsapp',
        verified: true
      });
    }

    // Create session
    const session = await authService.createSession(user.id, {
      authMethod: 'whatsapp',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    await auditLogger.log({
      category: 'auth',
      action: 'whatsapp_login_success',
      userId: user.id,
      details: { phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*') },
      severity: 'info',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        phone: phoneNumber,
        authMethod: 'whatsapp'
      },
      session: {
        token: session.token,
        expiresAt: session.expiresAt
      }
    });

  } catch (error) {
    console.error('WhatsApp OTP verification error:', error);
    
    await auditLogger.log({
      category: 'auth',
      action: 'whatsapp_verify_error',
      details: { error: error.message },
      severity: 'error',
      ipAddress: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Failed to verify OTP'
    });
  }
});

// ============================================================
// TELEGRAM AUTHENTICATION
// ============================================================

/**
 * POST /api/auth/telegram/generate-auth-link
 * Generate Telegram authentication link
 */
router.post('/telegram/generate-auth-link', async (req, res) => {
  try {
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    
    if (!botUsername) {
      return res.status(500).json({
        success: false,
        error: 'Telegram bot not configured'
      });
    }

    // Generate unique auth request ID
    const authRequestId = crypto.randomBytes(16).toString('hex');
    
    // Store auth request with expiration (10 minutes)
    await req.app.locals.cache.set(
      `telegram:auth:${authRequestId}`,
      { createdAt: Date.now(), status: 'pending' },
      600
    );

    // Generate Telegram auth link
    const authLink = `https://t.me/${botUsername}?start=auth_${authRequestId}`;

    await auditLogger.log({
      category: 'auth',
      action: 'telegram_auth_link_generated',
      details: { authRequestId },
      severity: 'info',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      authLink,
      authRequestId,
      expiresIn: 600,
      instructions: 'Click the link and start the bot to complete authentication'
    });

  } catch (error) {
    console.error('Telegram auth link generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate auth link'
    });
  }
});

/**
 * POST /api/auth/telegram/webhook
 * Telegram webhook for bot updates
 */
router.post('/telegram/webhook', async (req, res) => {
  try {
    const update = req.body;

    // Verify webhook signature
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const signature = req.headers['x-telegram-bot-api-secret-token'];
    
    if (secret && signature !== secret) {
      return res.status(403).json({ error: 'Invalid signature' });
    }

    // Handle /start command with auth parameter
    if (update.message && update.message.text) {
      const text = update.message.text;
      const chatId = update.message.chat.id;
      const user = update.message.from;

      // Check if this is an auth request
      const authMatch = text.match(/^\/start auth_([a-f0-9]{32})$/);
      
      if (authMatch) {
        const authRequestId = authMatch[1];
        const authKey = `telegram:auth:${authRequestId}`;
        const authRequest = await req.app.locals.cache.get(authKey);

        if (!authRequest) {
          await integrations.callTelegram('sendMessage', {
            chat_id: chatId,
            text: 'This authentication link has expired. Please request a new one.'
          });
          return res.json({ ok: true });
        }

        // Store user information
        await req.app.locals.cache.set(
          authKey,
          {
            ...authRequest,
            status: 'completed',
            telegramUser: {
              id: user.id,
              username: user.username,
              firstName: user.first_name,
              lastName: user.last_name
            }
          },
          600
        );

        // Send confirmation message
        await integrations.callTelegram('sendMessage', {
          chat_id: chatId,
          text: `✅ Authentication successful!\n\nWelcome, ${user.first_name}!`
        });

        await auditLogger.log({
          category: 'auth',
          action: 'telegram_auth_completed',
          details: {
            authRequestId,
            telegramUserId: user.id,
            username: user.username
          },
          severity: 'info'
        });
      }
    }

    res.json({ ok: true });

  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * POST /api/auth/telegram/check-auth
 * Check if Telegram authentication is complete
 */
router.post('/telegram/check-auth', async (req, res) => {
  try {
    const { authRequestId } = req.body;

    if (!authRequestId) {
      return res.status(400).json({
        success: false,
        error: 'authRequestId is required'
      });
    }

    const authKey = `telegram:auth:${authRequestId}`;
    const authRequest = await req.app.locals.cache.get(authKey);

    if (!authRequest) {
      return res.json({
        success: false,
        status: 'expired',
        error: 'Authentication request expired'
      });
    }

    if (authRequest.status !== 'completed') {
      return res.json({
        success: false,
        status: 'pending',
        message: 'Waiting for Telegram authentication'
      });
    }

    // Create or find user
    const telegramUser = authRequest.telegramUser;
    let user = await authService.findUserByTelegramId(telegramUser.id);
    
    if (!user) {
      user = await authService.createUser({
        telegramId: telegramUser.id,
        username: telegramUser.username,
        firstName: telegramUser.firstName,
        lastName: telegramUser.lastName,
        authMethod: 'telegram',
        verified: true
      });
    }

    // Create session
    const session = await authService.createSession(user.id, {
      authMethod: 'telegram',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Delete auth request
    await req.app.locals.cache.delete(authKey);

    await auditLogger.log({
      category: 'auth',
      action: 'telegram_login_success',
      userId: user.id,
      details: {
        telegramId: telegramUser.id,
        username: telegramUser.username
      },
      severity: 'info',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      status: 'completed',
      user: {
        id: user.id,
        username: telegramUser.username,
        firstName: telegramUser.firstName,
        lastName: telegramUser.lastName,
        authMethod: 'telegram'
      },
      session: {
        token: session.token,
        expiresAt: session.expiresAt
      }
    });

  } catch (error) {
    console.error('Telegram auth check error:', error);
    
    await auditLogger.log({
      category: 'auth',
      action: 'telegram_check_error',
      details: { error: error.message },
      severity: 'error',
      ipAddress: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Failed to check authentication status'
    });
  }
});

// ============================================================
// COMMON ENDPOINTS
// ============================================================

/**
 * GET /api/auth/social/health
 * Health check for social authentication services
 */
router.get('/social/health', async (req, res) => {
  try {
    const health = await integrations.healthCheck();
    
    res.json({
      success: true,
      services: {
        whatsapp: health.whatsapp,
        telegram: health.telegram
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Social auth health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

module.exports = router;
