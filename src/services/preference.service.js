/**
 * Preference Service
 * Handles user preferences and notification settings
 *
 * Features:
 * - User preferences management (flexible JSONB storage)
 * - Notification preferences management
 * - Preference import/export
 * - Preference reset to defaults
 * - Batch preference updates
 */

const db = require('../config/database');
const { AppError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

// Default preferences structure
const DEFAULT_PREFERENCES = {
  ui: {
    theme: 'light',
    sidebarCollapsed: false,
    compactMode: false,
    fontSize: 'medium',
    language: 'en'
  },
  notifications: {
    emailSummary: true,
    pushNotifications: true,
    desktopNotifications: true,
    instantMessaging: true
  },
  privacy: {
    profilePublic: false,
    showEmail: false,
    activityVisible: false,
    dataCollection: true
  },
  performance: {
    enableAnalytics: true,
    enableAutoSave: true,
    enableOfflineMode: false,
    cachingEnabled: true
  }
};

const DEFAULT_NOTIFICATION_PREFERENCES = {
  emailEnabled: true,
  pushEnabled: true,
  smsEnabled: false,
  inAppEnabled: true,
  projectUpdates: true,
  agentNotifications: true,
  systemAlerts: true,
  marketingEmails: false,
  digestFrequency: 'daily',
  quietHoursEnabled: false,
  quietHoursStart: null,
  quietHoursEnd: null
};

class PreferenceService {
  /**
   * Get all preferences for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User preferences
   */
  async getUserPreferences(userId) {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const result = await db.query(
        `SELECT category, key, value, updated_at
         FROM user_preferences
         WHERE user_id = $1
         ORDER BY category, key`,
        [userId]
      );

      // Transform flat structure to nested object
      const preferences = { ...DEFAULT_PREFERENCES };

      result.rows.forEach(row => {
        if (!preferences[row.category]) {
          preferences[row.category] = {};
        }
        preferences[row.category][row.key] = row.value;
      });

      return preferences;
    } catch (error) {
      logger.error('Error fetching user preferences:', error);
      throw error;
    }
  }

  /**
   * Get specific preference category
   * @param {string} userId - User ID
   * @param {string} category - Preference category
   * @returns {Promise<Object>} Category preferences
   */
  async getPreferenceCategory(userId, category) {
    try {
      if (!userId || !category) {
        throw new ValidationError('User ID and category are required');
      }

      const result = await db.query(
        `SELECT key, value, updated_at
         FROM user_preferences
         WHERE user_id = $1 AND category = $2
         ORDER BY key`,
        [userId, category]
      );

      const categoryPrefs = { ...DEFAULT_PREFERENCES[category] || {} };
      result.rows.forEach(row => {
        categoryPrefs[row.key] = row.value;
      });

      return categoryPrefs;
    } catch (error) {
      logger.error('Error fetching preference category:', error);
      throw error;
    }
  }

  /**
   * Get specific preference value
   * @param {string} userId - User ID
   * @param {string} category - Preference category
   * @param {string} key - Preference key
   * @returns {Promise<*>} Preference value
   */
  async getPreference(userId, category, key) {
    try {
      if (!userId || !category || !key) {
        throw new ValidationError('User ID, category, and key are required');
      }

      const result = await db.query(
        `SELECT value, updated_at
         FROM user_preferences
         WHERE user_id = $1 AND category = $2 AND key = $3`,
        [userId, category, key]
      );

      if (result.rows.length === 0) {
        return DEFAULT_PREFERENCES[category]?.[key] || null;
      }

      return result.rows[0].value;
    } catch (error) {
      logger.error('Error fetching preference:', error);
      throw error;
    }
  }

  /**
   * Set single preference
   * @param {string} userId - User ID
   * @param {string} category - Preference category
   * @param {string} key - Preference key
   * @param {*} value - Preference value
   * @returns {Promise<Object>} Updated preference
   */
  async setPreference(userId, category, key, value) {
    try {
      if (!userId || !category || !key) {
        throw new ValidationError('User ID, category, and key are required');
      }

      const result = await db.query(
        `INSERT INTO user_preferences (user_id, category, key, value)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, category, key)
         DO UPDATE SET value = $4, updated_at = CURRENT_TIMESTAMP
         RETURNING id, category, key, value, updated_at`,
        [userId, category, key, value]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error setting preference:', error);
      throw error;
    }
  }

  /**
   * Update multiple preferences
   * @param {string} userId - User ID
   * @param {Object} updates - Object with category/key/value updates
   * @returns {Promise<Array>} Updated preferences
   */
  async updatePreferences(userId, updates) {
    try {
      if (!userId || !updates || typeof updates !== 'object') {
        throw new ValidationError('User ID and updates object are required');
      }

      const results = [];

      for (const [category, preferences] of Object.entries(updates)) {
        if (typeof preferences === 'object') {
          for (const [key, value] of Object.entries(preferences)) {
            const result = await this.setPreference(userId, category, key, value);
            results.push(result);
          }
        }
      }

      return results;
    } catch (error) {
      logger.error('Error updating preferences:', error);
      throw error;
    }
  }

  /**
   * Delete single preference
   * @param {string} userId - User ID
   * @param {string} category - Preference category
   * @param {string} key - Preference key
   * @returns {Promise<boolean>} Success status
   */
  async deletePreference(userId, category, key) {
    try {
      if (!userId || !category || !key) {
        throw new ValidationError('User ID, category, and key are required');
      }

      const result = await db.query(
        `DELETE FROM user_preferences
         WHERE user_id = $1 AND category = $2 AND key = $3`,
        [userId, category, key]
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error deleting preference:', error);
      throw error;
    }
  }

  /**
   * Reset all preferences to defaults
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Reset preferences
   */
  async resetToDefaults(userId) {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      // Delete all user preferences
      await db.query(
        `DELETE FROM user_preferences WHERE user_id = $1`,
        [userId]
      );

      // Reset notification preferences to defaults
      await db.query(
        `UPDATE notification_preferences
         SET email_enabled = $1,
             push_enabled = $2,
             sms_enabled = $3,
             in_app_enabled = $4,
             project_updates = $5,
             agent_notifications = $6,
             system_alerts = $7,
             marketing_emails = $8,
             digest_frequency = $9,
             quiet_hours_enabled = $10
         WHERE user_id = $11`,
        [
          DEFAULT_NOTIFICATION_PREFERENCES.emailEnabled,
          DEFAULT_NOTIFICATION_PREFERENCES.pushEnabled,
          DEFAULT_NOTIFICATION_PREFERENCES.smsEnabled,
          DEFAULT_NOTIFICATION_PREFERENCES.inAppEnabled,
          DEFAULT_NOTIFICATION_PREFERENCES.projectUpdates,
          DEFAULT_NOTIFICATION_PREFERENCES.agentNotifications,
          DEFAULT_NOTIFICATION_PREFERENCES.systemAlerts,
          DEFAULT_NOTIFICATION_PREFERENCES.marketingEmails,
          DEFAULT_NOTIFICATION_PREFERENCES.digestFrequency,
          DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnabled,
          userId
        ]
      );

      return DEFAULT_PREFERENCES;
    } catch (error) {
      logger.error('Error resetting preferences:', error);
      throw error;
    }
  }

  /**
   * Export preferences for backup/transfer
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Preferences export with metadata
   */
  async exportPreferences(userId) {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const preferences = await this.getUserPreferences(userId);
      const notificationPrefs = await this.getNotificationPreferences(userId);

      return {
        userId,
        exportedAt: new Date().toISOString(),
        version: '1.0',
        preferences,
        notificationPreferences: notificationPrefs
      };
    } catch (error) {
      logger.error('Error exporting preferences:', error);
      throw error;
    }
  }

  /**
   * Import preferences from backup
   * @param {string} userId - User ID
   * @param {Object} importData - Exported preferences data
   * @returns {Promise<Object>} Imported preferences
   */
  async importPreferences(userId, importData) {
    try {
      if (!userId || !importData || !importData.preferences) {
        throw new ValidationError('User ID and preferences data are required');
      }

      // Import general preferences
      await this.updatePreferences(userId, importData.preferences);

      // Import notification preferences if available
      if (importData.notificationPreferences) {
        await this.updateNotificationPreferences(
          userId,
          importData.notificationPreferences
        );
      }

      return await this.getUserPreferences(userId);
    } catch (error) {
      logger.error('Error importing preferences:', error);
      throw error;
    }
  }

  // ============================================
  // Notification Preferences Methods
  // ============================================

  /**
   * Get notification preferences
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Notification preferences
   */
  async getNotificationPreferences(userId) {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const result = await db.query(
        `SELECT * FROM notification_preferences WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        // Create default notification preferences if not exists
        await db.query(
          `INSERT INTO notification_preferences (user_id)
           VALUES ($1)
           ON CONFLICT DO NOTHING`,
          [userId]
        );
        return DEFAULT_NOTIFICATION_PREFERENCES;
      }

      const row = result.rows[0];
      return {
        emailEnabled: row.email_enabled,
        pushEnabled: row.push_enabled,
        smsEnabled: row.sms_enabled,
        inAppEnabled: row.in_app_enabled,
        projectUpdates: row.project_updates,
        agentNotifications: row.agent_notifications,
        systemAlerts: row.system_alerts,
        marketingEmails: row.marketing_emails,
        digestFrequency: row.digest_frequency,
        quietHoursEnabled: row.quiet_hours_enabled,
        quietHoursStart: row.quiet_hours_start,
        quietHoursEnd: row.quiet_hours_end,
        updatedAt: row.updated_at
      };
    } catch (error) {
      logger.error('Error fetching notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   * @param {string} userId - User ID
   * @param {Object} updates - Notification preference updates
   * @returns {Promise<Object>} Updated notification preferences
   */
  async updateNotificationPreferences(userId, updates) {
    try {
      if (!userId || !updates || typeof updates !== 'object') {
        throw new ValidationError('User ID and updates object are required');
      }

      const {
        emailEnabled,
        pushEnabled,
        smsEnabled,
        inAppEnabled,
        projectUpdates,
        agentNotifications,
        systemAlerts,
        marketingEmails,
        digestFrequency,
        quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd
      } = updates;

      const result = await db.query(
        `UPDATE notification_preferences
         SET email_enabled = COALESCE($1, email_enabled),
             push_enabled = COALESCE($2, push_enabled),
             sms_enabled = COALESCE($3, sms_enabled),
             in_app_enabled = COALESCE($4, in_app_enabled),
             project_updates = COALESCE($5, project_updates),
             agent_notifications = COALESCE($6, agent_notifications),
             system_alerts = COALESCE($7, system_alerts),
             marketing_emails = COALESCE($8, marketing_emails),
             digest_frequency = COALESCE($9, digest_frequency),
             quiet_hours_enabled = COALESCE($10, quiet_hours_enabled),
             quiet_hours_start = COALESCE($11, quiet_hours_start),
             quiet_hours_end = COALESCE($12, quiet_hours_end),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $13
         RETURNING *`,
        [
          emailEnabled,
          pushEnabled,
          smsEnabled,
          inAppEnabled,
          projectUpdates,
          agentNotifications,
          systemAlerts,
          marketingEmails,
          digestFrequency,
          quietHoursEnabled,
          quietHoursStart,
          quietHoursEnd,
          userId
        ]
      );

      if (result.rows.length === 0) {
        throw new AppError('Notification preferences not found', 404);
      }

      const row = result.rows[0];
      return {
        emailEnabled: row.email_enabled,
        pushEnabled: row.push_enabled,
        smsEnabled: row.sms_enabled,
        inAppEnabled: row.in_app_enabled,
        projectUpdates: row.project_updates,
        agentNotifications: row.agent_notifications,
        systemAlerts: row.system_alerts,
        marketingEmails: row.marketing_emails,
        digestFrequency: row.digest_frequency,
        quietHoursEnabled: row.quiet_hours_enabled,
        quietHoursStart: row.quiet_hours_start,
        quietHoursEnd: row.quiet_hours_end,
        updatedAt: row.updated_at
      };
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      throw error;
    }
  }
}

module.exports = new PreferenceService();
