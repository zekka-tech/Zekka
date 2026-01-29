/**
 * Email Service
 * =============
 *
 * Handles all email sending functionality using Nodemailer
 *
 * Features:
 * - Email verification
 * - Password reset emails
 * - Notification emails
 * - Template-based emails
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeTransporter() {
    try {
      const emailConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      };

      // Check if SMTP credentials are configured
      if (!emailConfig.auth.user || !emailConfig.auth.pass) {
        logger.warn(
          'SMTP credentials not configured. Email functionality will be disabled.'
        );
        this.initialized = false;
        return;
      }

      this.transporter = nodemailer.createTransport(emailConfig);
      this.initialized = true;

      // Verify connection
      this.transporter.verify((error) => {
        if (error) {
          logger.error('Email transporter verification failed:', error);
          this.initialized = false;
        } else {
          logger.info('Email service initialized successfully');
        }
      });
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.initialized = false;
    }
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(email, token) {
    if (!this.initialized) {
      logger.warn(
        `Email service not initialized. Would send verification email to ${email}`
      );
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Verify Your Email - Zekka Framework',
        html: this.getVerificationEmailTemplate(verificationUrl, token)
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`Verification email sent to ${email}`, {
        messageId: info.messageId
      });

      return {
        success: true,
        message: 'Verification email sent successfully',
        messageId: info.messageId
      };
    } catch (error) {
      logger.error(`Failed to send verification email to ${email}:`, error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, token) {
    if (!this.initialized) {
      logger.warn(
        `Email service not initialized. Would send password reset email to ${email}`
      );
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Password Reset Request - Zekka Framework',
        html: this.getPasswordResetEmailTemplate(resetUrl, token)
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`Password reset email sent to ${email}`, {
        messageId: info.messageId
      });

      return {
        success: true,
        message: 'Password reset email sent successfully',
        messageId: info.messageId
      };
    } catch (error) {
      logger.error(`Failed to send password reset email to ${email}:`, error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Get verification email template
   */
  getVerificationEmailTemplate(verificationUrl, token) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          .token-box { background: #e8e8e8; padding: 15px; border-radius: 5px; font-family: monospace; word-break: break-all; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email Address</h1>
          </div>
          <div class="content">
            <h2>Welcome to Zekka Framework!</h2>
            <p>Thank you for registering. To complete your registration and activate your account, please verify your email address.</p>

            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>

            <p>Or copy and paste this link into your browser:</p>
            <div class="token-box">${verificationUrl}</div>

            <p><strong>Security Note:</strong> This verification link will expire in 24 hours for security reasons.</p>

            <p>If you didn't create an account with Zekka Framework, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Zekka Framework. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get password reset email template
   */
  getPasswordResetEmailTemplate(resetUrl, token) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
          .token-box { background: #e8e8e8; padding: 15px; border-radius: 5px; font-family: monospace; word-break: break-all; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>We received a request to reset the password for your Zekka Framework account.</p>

            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>

            <p>Or copy and paste this link into your browser:</p>
            <div class="token-box">${resetUrl}</div>

            <div class="warning">
              <strong>Security Warning:</strong> This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
            </div>

            <p>For security reasons, this link can only be used once.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Zekka Framework. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Check if email service is ready
   */
  isReady() {
    return this.initialized;
  }
}

module.exports = new EmailService();
