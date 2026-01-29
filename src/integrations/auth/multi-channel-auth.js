/**
 * Multi-Channel Authentication Gateway
 * Unified authentication system supporting multiple channels
 * Channels: SMS, WhatsApp, Telegram, Email, Voice
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class MultiChannelAuth extends EventEmitter {
  constructor(contextBus, logger, config = {}) {
    super();
    this.contextBus = contextBus;
    this.logger = logger;
    this.config = {
      otpLength: config.otpLength || 6,
      otpExpiry: config.otpExpiry || 300000, // 5 minutes
      maxAttempts: config.maxAttempts || 3,
      cooldownPeriod: config.cooldownPeriod || 900000, // 15 minutes
      ...config
    };

    this.channels = this.initializeChannels();
    this.otpStore = new Map();
    this.attemptTracker = new Map();
    this.sessionStore = new Map();
  }

  /**
   * Initialize authentication channels
   */
  initializeChannels() {
    return {
      sms: {
        name: 'SMS Authentication',
        provider: 'twilio',
        enabled: true,
        config: {
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          phoneNumber: process.env.TWILIO_PHONE_NUMBER
        },
        rateLimit: { requests: 5, window: 60000 }, // 5 per minute
        priority: 1
      },
      whatsapp: {
        name: 'WhatsApp Authentication',
        provider: 'twilio',
        enabled: true,
        config: {
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER
        },
        rateLimit: { requests: 10, window: 60000 }, // 10 per minute
        priority: 2
      },
      telegram: {
        name: 'Telegram Authentication',
        provider: 'telegram-bot',
        enabled: true,
        config: {
          botToken: process.env.TELEGRAM_BOT_TOKEN,
          apiUrl: 'https://api.telegram.org'
        },
        rateLimit: { requests: 20, window: 60000 }, // 20 per minute
        priority: 3
      },
      email: {
        name: 'Email Authentication',
        provider: 'sendgrid',
        enabled: true,
        config: {
          apiKey: process.env.SENDGRID_API_KEY,
          fromEmail: process.env.SENDGRID_FROM_EMAIL,
          fromName: process.env.SENDGRID_FROM_NAME || 'Zekka Framework'
        },
        rateLimit: { requests: 10, window: 60000 }, // 10 per minute
        priority: 4
      },
      voice: {
        name: 'Voice Call Authentication',
        provider: 'twilio',
        enabled: true,
        config: {
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          phoneNumber: process.env.TWILIO_PHONE_NUMBER
        },
        rateLimit: { requests: 3, window: 60000 }, // 3 per minute
        priority: 5
      }
    };
  }

  /**
   * Initialize authentication request
   */
  async initiateAuth(userId, channel, destination, options = {}) {
    this.logger.info(
      `[MultiChannelAuth] Initiating ${channel} auth for user: ${userId}`
    );

    // Validate channel
    if (!this.channels[channel] || !this.channels[channel].enabled) {
      throw new Error(`Authentication channel not available: ${channel}`);
    }

    // Check rate limiting
    await this.checkRateLimit(userId, channel);

    // Check attempt tracker
    await this.checkAttempts(userId);

    // Generate OTP
    const otp = this.generateOTP();
    const otpId = `${userId}-${channel}-${Date.now()}`;

    // Store OTP
    this.otpStore.set(otpId, {
      userId,
      channel,
      destination,
      otp,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.otpExpiry,
      verified: false,
      attempts: 0
    });

    try {
      // Send OTP via channel
      await this.sendOTP(channel, destination, otp, options);

      // Publish event
      await this.contextBus.publish('auth.otp-sent', {
        userId,
        channel,
        destination: this.maskDestination(destination),
        timestamp: new Date().toISOString()
      });

      this.logger.info(
        `[MultiChannelAuth] OTP sent via ${channel} to ${this.maskDestination(destination)}`
      );

      return {
        otpId,
        channel,
        destination: this.maskDestination(destination),
        expiresIn: this.config.otpExpiry / 1000 // seconds
      };
    } catch (error) {
      this.logger.error(
        `[MultiChannelAuth] Failed to send OTP via ${channel}:`,
        error
      );
      this.otpStore.delete(otpId);
      throw error;
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(otpId, providedOtp) {
    this.logger.info(`[MultiChannelAuth] Verifying OTP: ${otpId}`);

    const otpData = this.otpStore.get(otpId);
    if (!otpData) {
      throw new Error('OTP not found or expired');
    }

    // Check expiry
    if (Date.now() > otpData.expiresAt) {
      this.otpStore.delete(otpId);
      throw new Error('OTP has expired');
    }

    // Increment attempts
    otpData.attempts++;

    // Check max attempts
    if (otpData.attempts > this.config.maxAttempts) {
      this.otpStore.delete(otpId);
      await this.trackFailedAttempt(otpData.userId);
      throw new Error('Maximum verification attempts exceeded');
    }

    // Verify OTP
    if (otpData.otp !== providedOtp) {
      await this.contextBus.publish('auth.verification-failed', {
        userId: otpData.userId,
        channel: otpData.channel,
        reason: 'invalid_otp',
        timestamp: new Date().toISOString()
      });
      throw new Error('Invalid OTP');
    }

    // Mark as verified
    otpData.verified = true;

    // Create session
    const session = await this.createSession(otpData.userId, otpData.channel);

    // Cleanup
    this.otpStore.delete(otpId);
    this.clearAttempts(otpData.userId);

    // Publish success
    await this.contextBus.publish('auth.verification-success', {
      userId: otpData.userId,
      channel: otpData.channel,
      sessionId: session.id,
      timestamp: new Date().toISOString()
    });

    this.logger.info(
      `[MultiChannelAuth] User ${otpData.userId} authenticated successfully via ${otpData.channel}`
    );

    return session;
  }

  /**
   * Send OTP via specific channel
   */
  async sendOTP(channel, destination, otp, options = {}) {
    const handlers = {
      sms: () => this.sendSMS(destination, otp, options),
      whatsapp: () => this.sendWhatsApp(destination, otp, options),
      telegram: () => this.sendTelegram(destination, otp, options),
      email: () => this.sendEmail(destination, otp, options),
      voice: () => this.sendVoiceCall(destination, otp, options)
    };

    const handler = handlers[channel];
    if (!handler) {
      throw new Error(`No handler for channel: ${channel}`);
    }

    return await handler();
  }

  /**
   * SMS authentication via Twilio
   */
  async sendSMS(phoneNumber, otp, options = {}) {
    const { config } = this.channels.sms;
    const message = options.message
      || `Your verification code is: ${otp}. Valid for 5 minutes.`;

    this.logger.info(
      `[MultiChannelAuth] Sending SMS to ${this.maskDestination(phoneNumber)}`
    );

    // In production, integrate with Twilio SDK:
    // const twilio = require('twilio')(config.accountSid, config.authToken);
    // await twilio.messages.create({
    //   body: message,
    //   from: config.phoneNumber,
    //   to: phoneNumber
    // });

    // Mock implementation
    return {
      channel: 'sms',
      destination: phoneNumber,
      message,
      status: 'sent',
      provider: 'twilio'
    };
  }

  /**
   * WhatsApp authentication via Twilio
   */
  async sendWhatsApp(phoneNumber, otp, options = {}) {
    const { config } = this.channels.whatsapp;
    const message = options.message
      || `🔐 Your Zekka verification code: *${otp}*\n\nValid for 5 minutes.`;

    this.logger.info(
      `[MultiChannelAuth] Sending WhatsApp to ${this.maskDestination(phoneNumber)}`
    );

    // In production, integrate with Twilio WhatsApp:
    // const twilio = require('twilio')(config.accountSid, config.authToken);
    // await twilio.messages.create({
    //   body: message,
    //   from: `whatsapp:${config.whatsappNumber}`,
    //   to: `whatsapp:${phoneNumber}`
    // });

    return {
      channel: 'whatsapp',
      destination: phoneNumber,
      message,
      status: 'sent',
      provider: 'twilio'
    };
  }

  /**
   * Telegram authentication
   */
  async sendTelegram(chatId, otp, options = {}) {
    const { config } = this.channels.telegram;
    const message = options.message
      || `🔐 Your verification code: \`${otp}\`\n\nValid for 5 minutes.`;

    this.logger.info(
      `[MultiChannelAuth] Sending Telegram message to ${chatId}`
    );

    // In production, integrate with Telegram Bot API:
    // const axios = require('axios');
    // await axios.post(`${config.apiUrl}/bot${config.botToken}/sendMessage`, {
    //   chat_id: chatId,
    //   text: message,
    //   parse_mode: 'Markdown'
    // });

    return {
      channel: 'telegram',
      destination: chatId,
      message,
      status: 'sent',
      provider: 'telegram-bot'
    };
  }

  /**
   * Email authentication via SendGrid
   */
  async sendEmail(email, otp, options = {}) {
    const { config } = this.channels.email;
    const subject = options.subject || 'Your Verification Code';
    const htmlContent = options.htmlContent || this.generateEmailTemplate(otp);

    this.logger.info(
      `[MultiChannelAuth] Sending email to ${this.maskDestination(email)}`
    );

    // In production, integrate with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(config.apiKey);
    // await sgMail.send({
    //   to: email,
    //   from: { email: config.fromEmail, name: config.fromName },
    //   subject,
    //   html: htmlContent
    // });

    return {
      channel: 'email',
      destination: email,
      subject,
      status: 'sent',
      provider: 'sendgrid'
    };
  }

  /**
   * Voice call authentication via Twilio
   */
  async sendVoiceCall(phoneNumber, otp, options = {}) {
    const { config } = this.channels.voice;
    const message = `Your verification code is: ${otp.split('').join(', ')}. I repeat: ${otp.split('').join(', ')}`;

    this.logger.info(
      `[MultiChannelAuth] Initiating voice call to ${this.maskDestination(phoneNumber)}`
    );

    // In production, integrate with Twilio Voice:
    // const twilio = require('twilio')(config.accountSid, config.authToken);
    // await twilio.calls.create({
    //   twiml: `<Response><Say>${message}</Say></Response>`,
    //   from: config.phoneNumber,
    //   to: phoneNumber
    // });

    return {
      channel: 'voice',
      destination: phoneNumber,
      message,
      status: 'sent',
      provider: 'twilio'
    };
  }

  /**
   * Generate OTP
   */
  generateOTP() {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < this.config.otpLength; i++) {
      otp += digits[crypto.randomInt(0, digits.length)];
    }
    return otp;
  }

  /**
   * Create authenticated session
   */
  async createSession(userId, channel) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const session = {
      id: sessionId,
      userId,
      channel,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      lastActivity: Date.now()
    };

    this.sessionStore.set(sessionId, session);
    return session;
  }

  /**
   * Rate limiting
   */
  async checkRateLimit(userId, channel) {
    // Simplified rate limiting implementation
    // In production, use Redis or similar
    return true;
  }

  /**
   * Track failed attempts
   */
  async checkAttempts(userId) {
    const attempts = this.attemptTracker.get(userId);
    if (attempts && attempts.count >= this.config.maxAttempts) {
      const cooldownRemaining = attempts.cooldownUntil - Date.now();
      if (cooldownRemaining > 0) {
        throw new Error(
          `Too many failed attempts. Try again in ${Math.ceil(cooldownRemaining / 60000)} minutes`
        );
      } else {
        this.attemptTracker.delete(userId);
      }
    }
  }

  async trackFailedAttempt(userId) {
    const attempts = this.attemptTracker.get(userId) || { count: 0 };
    attempts.count++;
    attempts.cooldownUntil = Date.now() + this.config.cooldownPeriod;
    this.attemptTracker.set(userId, attempts);
  }

  clearAttempts(userId) {
    this.attemptTracker.delete(userId);
  }

  /**
   * Mask destination for privacy
   */
  maskDestination(destination) {
    if (destination.includes('@')) {
      // Email
      const [local, domain] = destination.split('@');
      return `${local.substring(0, 2)}***@${domain}`;
    }
    if (destination.startsWith('+')) {
      // Phone number
      return `${destination.substring(0, 3)}****${destination.slice(-2)}`;
    }
    // Other (e.g., Telegram chat ID)
    return `***${destination.slice(-4)}`;
  }

  /**
   * Generate email template
   */
  generateEmailTemplate(otp) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .otp-code { font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; padding: 20px; background: white; border-radius: 8px; letter-spacing: 8px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verification Code</h1>
          </div>
          <div class="content">
            <p>Your verification code is:</p>
            <div class="otp-code">${otp}</div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Zekka Framework. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Validate session
   */
  validateSession(sessionId) {
    const session = this.sessionStore.get(sessionId);
    if (!session) {
      return null;
    }

    if (Date.now() > session.expiresAt) {
      this.sessionStore.delete(sessionId);
      return null;
    }

    session.lastActivity = Date.now();
    return session;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      channels: Object.keys(this.channels).length,
      activeOTPs: this.otpStore.size,
      activeSessions: this.sessionStore.size,
      channelStatus: Object.entries(this.channels).map(([id, channel]) => ({
        id,
        name: channel.name,
        enabled: channel.enabled,
        provider: channel.provider
      }))
    };
  }
}

module.exports = MultiChannelAuth;
