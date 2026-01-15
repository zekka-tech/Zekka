#!/usr/bin/env node
/**
 * Alert Notification System
 * 
 * Sends alerts via multiple channels:
 * - Email (SMTP)
 * - Slack (Webhook)
 * - Discord (Webhook)
 * - PagerDuty (API)
 * - Custom webhooks
 * 
 * Usage:
 *   node scripts/alert-notify.js --channel slack --severity critical --message "Database down"
 *   node scripts/alert-notify.js --channel email --severity high --message "High CPU usage"
 */

const https = require('https');
const http = require('http');
const nodemailer = require('nodemailer');
const { URL } = require('url');

class AlertNotifier {
  constructor(options = {}) {
    this.channels = {
      email: this.sendEmail.bind(this),
      slack: this.sendSlack.bind(this),
      discord: this.sendDiscord.bind(this),
      pagerduty: this.sendPagerDuty.bind(this),
      webhook: this.sendWebhook.bind(this)
    };
    
    // Load configuration from environment
    this.config = {
      email: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        },
        from: process.env.EMAIL_FROM || 'alerts@yourdomain.com',
        to: process.env.ALERT_EMAIL_TO || 'admin@yourdomain.com'
      },
      slack: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL
      },
      discord: {
        webhookUrl: process.env.DISCORD_WEBHOOK_URL
      },
      pagerduty: {
        routingKey: process.env.PAGERDUTY_ROUTING_KEY,
        apiUrl: 'https://events.pagerduty.com/v2/enqueue'
      },
      webhook: {
        url: process.env.CUSTOM_WEBHOOK_URL,
        headers: {}
      }
    };
  }

  /**
   * Log message
   */
  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    const color = colors[type] || colors.info;
    console.log(`${color}${message}${colors.reset}`);
  }

  /**
   * Get severity emoji and color
   */
  getSeverityInfo(severity) {
    const severityMap = {
      critical: { emoji: '🔴', color: '#FF0000', level: 'critical' },
      high: { emoji: '🟠', color: '#FF6600', level: 'error' },
      medium: { emoji: '🟡', color: '#FFCC00', level: 'warning' },
      low: { emoji: '🟢', color: '#00CC00', level: 'info' },
      info: { emoji: 'ℹ️', color: '#0099CC', level: 'info' }
    };
    return severityMap[severity] || severityMap.info;
  }

  /**
   * Send email notification
   */
  async sendEmail(alert) {
    this.log('📧 Sending email notification...', 'info');
    
    const transporter = nodemailer.createTransporter(this.config.email);
    
    const severityInfo = this.getSeverityInfo(alert.severity);
    
    const mailOptions = {
      from: this.config.email.from,
      to: this.config.email.to,
      subject: `${severityInfo.emoji} ${alert.severity.toUpperCase()}: ${alert.title}`,
      html: `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: ${severityInfo.color}; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
              .content { background-color: #f5f5f5; padding: 20px; border-radius: 0 0 5px 5px; }
              .severity { font-weight: bold; font-size: 18px; }
              .timestamp { color: #666; font-size: 14px; }
              .details { background-color: white; padding: 15px; margin-top: 15px; border-radius: 5px; }
              .footer { margin-top: 20px; color: #999; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="severity">${severityInfo.emoji} ${alert.severity.toUpperCase()} ALERT</div>
              </div>
              <div class="content">
                <h2>${alert.title}</h2>
                <div class="timestamp">Time: ${new Date().toISOString()}</div>
                <div class="details">
                  <p><strong>Message:</strong> ${alert.message}</p>
                  ${alert.source ? `<p><strong>Source:</strong> ${alert.source}</p>` : ''}
                  ${alert.host ? `<p><strong>Host:</strong> ${alert.host}</p>` : ''}
                  ${alert.details ? `<p><strong>Details:</strong> ${alert.details}</p>` : ''}
                </div>
                ${alert.actionUrl ? `<p><a href="${alert.actionUrl}" style="background-color: ${severityInfo.color}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">View Details</a></p>` : ''}
              </div>
              <div class="footer">
                <p>Zekka Framework Alert System</p>
                <p>Instance: ${process.env.INSTANCE_ID || 'unknown'}</p>
              </div>
            </div>
          </body>
        </html>
      `
    };
    
    try {
      await transporter.sendMail(mailOptions);
      this.log('✅ Email sent successfully', 'success');
      return { success: true, channel: 'email' };
    } catch (error) {
      this.log(`❌ Email failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Send Slack notification
   */
  async sendSlack(alert) {
    this.log('💬 Sending Slack notification...', 'info');
    
    if (!this.config.slack.webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }
    
    const severityInfo = this.getSeverityInfo(alert.severity);
    
    const payload = {
      text: `${severityInfo.emoji} *${alert.severity.toUpperCase()} ALERT*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${severityInfo.emoji} ${alert.title}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Severity:*\n${alert.severity.toUpperCase()}`
            },
            {
              type: 'mrkdwn',
              text: `*Time:*\n${new Date().toISOString()}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Message:*\n${alert.message}`
          }
        }
      ],
      attachments: [
        {
          color: severityInfo.color,
          fields: [
            { title: 'Source', value: alert.source || 'N/A', short: true },
            { title: 'Host', value: alert.host || process.env.HOSTNAME || 'N/A', short: true }
          ]
        }
      ]
    };
    
    if (alert.details) {
      payload.blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Details:*\n\`\`\`${alert.details}\`\`\``
        }
      });
    }
    
    if (alert.actionUrl) {
      payload.blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Details'
            },
            url: alert.actionUrl
          }
        ]
      });
    }
    
    return this.sendWebhookRequest(this.config.slack.webhookUrl, payload, 'Slack');
  }

  /**
   * Send Discord notification
   */
  async sendDiscord(alert) {
    this.log('🎮 Sending Discord notification...', 'info');
    
    if (!this.config.discord.webhookUrl) {
      throw new Error('Discord webhook URL not configured');
    }
    
    const severityInfo = this.getSeverityInfo(alert.severity);
    
    const payload = {
      content: `${severityInfo.emoji} **${alert.severity.toUpperCase()} ALERT**`,
      embeds: [
        {
          title: alert.title,
          description: alert.message,
          color: parseInt(severityInfo.color.substring(1), 16),
          fields: [
            { name: 'Severity', value: alert.severity.toUpperCase(), inline: true },
            { name: 'Source', value: alert.source || 'N/A', inline: true },
            { name: 'Host', value: alert.host || process.env.HOSTNAME || 'N/A', inline: true }
          ],
          timestamp: new Date().toISOString(),
          footer: {
            text: 'Zekka Framework Alert System'
          }
        }
      ]
    };
    
    if (alert.details) {
      payload.embeds[0].fields.push({
        name: 'Details',
        value: `\`\`\`\n${alert.details.substring(0, 1000)}\n\`\`\``
      });
    }
    
    return this.sendWebhookRequest(this.config.discord.webhookUrl, payload, 'Discord');
  }

  /**
   * Send PagerDuty notification
   */
  async sendPagerDuty(alert) {
    this.log('📟 Sending PagerDuty notification...', 'info');
    
    if (!this.config.pagerduty.routingKey) {
      throw new Error('PagerDuty routing key not configured');
    }
    
    const severityInfo = this.getSeverityInfo(alert.severity);
    
    const payload = {
      routing_key: this.config.pagerduty.routingKey,
      event_action: 'trigger',
      payload: {
        summary: alert.title,
        severity: severityInfo.level,
        source: alert.source || 'zekka-framework',
        component: alert.component || 'application',
        custom_details: {
          message: alert.message,
          details: alert.details,
          host: alert.host || process.env.HOSTNAME,
          timestamp: new Date().toISOString()
        }
      }
    };
    
    return this.sendWebhookRequest(this.config.pagerduty.apiUrl, payload, 'PagerDuty');
  }

  /**
   * Send custom webhook notification
   */
  async sendWebhook(alert) {
    this.log('🔗 Sending webhook notification...', 'info');
    
    if (!this.config.webhook.url) {
      throw new Error('Webhook URL not configured');
    }
    
    const payload = {
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      source: alert.source,
      host: alert.host || process.env.HOSTNAME,
      details: alert.details,
      timestamp: new Date().toISOString()
    };
    
    return this.sendWebhookRequest(this.config.webhook.url, payload, 'Webhook');
  }

  /**
   * Generic webhook request sender
   */
  async sendWebhookRequest(url, payload, serviceName) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.webhook.headers
        }
      };
      
      const req = protocol.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.log(`✅ ${serviceName} notification sent successfully`, 'success');
            resolve({ success: true, channel: serviceName.toLowerCase(), statusCode: res.statusCode });
          } else {
            this.log(`❌ ${serviceName} failed with status ${res.statusCode}`, 'error');
            reject(new Error(`${serviceName} request failed: ${res.statusCode} - ${data}`));
          }
        });
      });
      
      req.on('error', (error) => {
        this.log(`❌ ${serviceName} request error: ${error.message}`, 'error');
        reject(error);
      });
      
      req.write(JSON.stringify(payload));
      req.end();
    });
  }

  /**
   * Send alert to all configured channels
   */
  async sendToAll(alert) {
    const results = [];
    const errors = [];
    
    for (const [channel, sendFunc] of Object.entries(this.channels)) {
      try {
        // Check if channel is configured
        const isConfigured = this.isChannelConfigured(channel);
        if (!isConfigured) {
          this.log(`⚠️  ${channel} not configured, skipping`, 'warning');
          continue;
        }
        
        const result = await sendFunc(alert);
        results.push(result);
      } catch (error) {
        errors.push({ channel, error: error.message });
      }
    }
    
    return { results, errors };
  }

  /**
   * Check if channel is configured
   */
  isChannelConfigured(channel) {
    switch (channel) {
      case 'email':
        return this.config.email.auth.user && this.config.email.auth.pass;
      case 'slack':
        return !!this.config.slack.webhookUrl;
      case 'discord':
        return !!this.config.discord.webhookUrl;
      case 'pagerduty':
        return !!this.config.pagerduty.routingKey;
      case 'webhook':
        return !!this.config.webhook.url;
      default:
        return false;
    }
  }

  /**
   * Send alert
   */
  async send(alert) {
    const channel = alert.channel || 'all';
    
    if (channel === 'all') {
      return this.sendToAll(alert);
    } else if (this.channels[channel]) {
      return this.channels[channel](alert);
    } else {
      throw new Error(`Unknown channel: ${channel}`);
    }
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const alert = {
    channel: args.includes('--channel') ? args[args.indexOf('--channel') + 1] : 'all',
    severity: args.includes('--severity') ? args[args.indexOf('--severity') + 1] : 'info',
    title: args.includes('--title') ? args[args.indexOf('--title') + 1] : 'Alert',
    message: args.includes('--message') ? args[args.indexOf('--message') + 1] : 'No message provided',
    source: args.includes('--source') ? args[args.indexOf('--source') + 1] : 'manual',
    details: args.includes('--details') ? args[args.indexOf('--details') + 1] : undefined,
    actionUrl: args.includes('--url') ? args[args.indexOf('--url') + 1] : undefined
  };
  
  const notifier = new AlertNotifier();
  
  notifier.send(alert)
    .then(result => {
      console.log('\n✅ Alert sent successfully');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error('\n❌ Alert failed:', error.message);
      process.exit(1);
    });
}

module.exports = AlertNotifier;
