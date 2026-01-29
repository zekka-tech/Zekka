/**
 * Preferences Validation Schemas
 * Joi schemas for validating preference-related requests
 */

const Joi = require('joi');

const preferencesSchemas = {
  /**
   * Preference category parameter validation
   */
  categoryParam: Joi.object({
    category: Joi.string()
      .valid('ui', 'notifications', 'privacy', 'performance')
      .required()
      .messages({
        'any.only': 'Category must be one of: ui, notifications, privacy, performance',
        'any.required': 'Category is required'
      })
  }),

  /**
   * Preference key parameter validation
   */
  preferenceKeyParam: Joi.object({
    category: Joi.string()
      .valid('ui', 'notifications', 'privacy', 'performance')
      .required(),
    key: Joi.string()
      .min(1)
      .max(255)
      .required()
      .messages({
        'string.min': 'Preference key must not be empty',
        'string.max': 'Preference key must not exceed 255 characters',
        'any.required': 'Preference key is required'
      })
  }),

  /**
   * Update preferences - nested object validation
   */
  updatePreferences: Joi.object({
    ui: Joi.object({
      theme: Joi.string().valid('light', 'dark', 'auto').optional(),
      sidebarCollapsed: Joi.boolean().optional(),
      compactMode: Joi.boolean().optional(),
      fontSize: Joi.string().valid('small', 'medium', 'large').optional(),
      language: Joi.string().length(2).optional()
    }).optional(),

    notifications: Joi.object({
      emailSummary: Joi.boolean().optional(),
      pushNotifications: Joi.boolean().optional(),
      desktopNotifications: Joi.boolean().optional(),
      instantMessaging: Joi.boolean().optional()
    }).optional(),

    privacy: Joi.object({
      profilePublic: Joi.boolean().optional(),
      showEmail: Joi.boolean().optional(),
      activityVisible: Joi.boolean().optional(),
      dataCollection: Joi.boolean().optional()
    }).optional(),

    performance: Joi.object({
      enableAnalytics: Joi.boolean().optional(),
      enableAutoSave: Joi.boolean().optional(),
      enableOfflineMode: Joi.boolean().optional(),
      cachingEnabled: Joi.boolean().optional()
    }).optional()
  }).min(1).messages({
    'object.min': 'At least one preference category must be provided'
  }),

  /**
   * Import preferences validation
   */
  importPreferences: Joi.object({
    preferences: Joi.object().required().messages({
      'any.required': 'Preferences object is required'
    }),
    notificationPreferences: Joi.object({
      emailEnabled: Joi.boolean().optional(),
      pushEnabled: Joi.boolean().optional(),
      smsEnabled: Joi.boolean().optional(),
      inAppEnabled: Joi.boolean().optional(),
      projectUpdates: Joi.boolean().optional(),
      agentNotifications: Joi.boolean().optional(),
      systemAlerts: Joi.boolean().optional(),
      marketingEmails: Joi.boolean().optional(),
      digestFrequency: Joi.string()
        .valid('realtime', 'daily', 'weekly', 'never')
        .optional(),
      quietHoursEnabled: Joi.boolean().optional(),
      quietHoursStart: Joi.string()
        .pattern(/^\d{2}:\d{2}$/)
        .optional()
        .messages({
          'string.pattern.base': 'Start time must be in HH:MM format'
        }),
      quietHoursEnd: Joi.string()
        .pattern(/^\d{2}:\d{2}$/)
        .optional()
        .messages({
          'string.pattern.base': 'End time must be in HH:MM format'
        })
    }).optional()
  }),

  /**
   * Update notification preferences
   */
  updateNotificationPreferences: Joi.object({
    emailEnabled: Joi.boolean().optional(),
    pushEnabled: Joi.boolean().optional(),
    smsEnabled: Joi.boolean().optional(),
    inAppEnabled: Joi.boolean().optional(),
    projectUpdates: Joi.boolean().optional(),
    agentNotifications: Joi.boolean().optional(),
    systemAlerts: Joi.boolean().optional(),
    marketingEmails: Joi.boolean().optional(),
    digestFrequency: Joi.string()
      .valid('realtime', 'daily', 'weekly', 'never')
      .optional()
      .messages({
        'any.only': 'Digest frequency must be one of: realtime, daily, weekly, never'
      }),
    quietHoursEnabled: Joi.boolean().optional(),
    quietHoursStart: Joi.string()
      .pattern(/^\d{2}:\d{2}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Start time must be in HH:MM format'
      }),
    quietHoursEnd: Joi.string()
      .pattern(/^\d{2}:\d{2}$/)
      .optional()
      .messages({
        'string.pattern.base': 'End time must be in HH:MM format'
      })
  }).min(1).messages({
    'object.min': 'At least one notification preference must be provided'
  }),

  /**
   * Notification channel parameter validation
   */
  notificationChannelParam: Joi.object({
    channel: Joi.string()
      .valid('email', 'push', 'sms', 'inApp')
      .required()
      .messages({
        'any.only': 'Channel must be one of: email, push, sms, inApp',
        'any.required': 'Channel is required'
      })
  }),

  /**
   * Update notification channel
   */
  updateNotificationChannel: Joi.object({
    enabled: Joi.boolean().required().messages({
      'any.required': 'Enabled status is required'
    })
  }),

  /**
   * Update quiet hours
   */
  updateQuietHours: Joi.object({
    enabled: Joi.boolean().required().messages({
      'any.required': 'Enabled status is required'
    }),
    startTime: Joi.string()
      .pattern(/^\d{2}:\d{2}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Start time must be in HH:MM format'
      }),
    endTime: Joi.string()
      .pattern(/^\d{2}:\d{2}$/)
      .optional()
      .messages({
        'string.pattern.base': 'End time must be in HH:MM format'
      })
  }).when('enabled', {
    is: true,
    then: Joi.object().keys({
      startTime: Joi.string()
        .pattern(/^\d{2}:\d{2}$/)
        .required()
        .messages({
          'any.required': 'Start time is required when quiet hours are enabled'
        }),
      endTime: Joi.string()
        .pattern(/^\d{2}:\d{2}$/)
        .required()
        .messages({
          'any.required': 'End time is required when quiet hours are enabled'
        })
    })
  })
};

module.exports = preferencesSchemas;
