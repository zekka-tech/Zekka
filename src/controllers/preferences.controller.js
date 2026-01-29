/**
 * Preferences Controller
 * Request handlers for user preferences and notification settings
 *
 * Endpoints:
 * - GET /api/v1/preferences - Get all preferences
 * - GET /api/v1/preferences/:category - Get category preferences
 * - PUT /api/v1/preferences - Update preferences
 * - DELETE /api/v1/preferences - Reset to defaults
 * - POST /api/v1/preferences/export - Export preferences
 * - POST /api/v1/preferences/import - Import preferences
 * - GET /api/v1/preferences/notifications - Get notification preferences
 * - PUT /api/v1/preferences/notifications - Update notification preferences
 */

const preferenceService = require('../services/preference.service');
const { AppError, ValidationError } = require('../utils/errors');

class PreferencesController {
  /**
   * Get all user preferences
   * GET /api/v1/preferences
   */
  async getPreferences(req, res, next) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const preferences = await preferenceService.getUserPreferences(userId);

      res.status(200).json({
        success: true,
        data: preferences
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get preferences for a specific category
   * GET /api/v1/preferences/:category
   */
  async getPreferenceCategory(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { category } = req.params;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!category) {
        throw new ValidationError('Category is required');
      }

      const preferences = await preferenceService.getPreferenceCategory(
        userId,
        category
      );

      res.status(200).json({
        success: true,
        data: {
          category,
          preferences
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific preference value
   * GET /api/v1/preferences/:category/:key
   */
  async getPreference(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { category, key } = req.params;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!category || !key) {
        throw new ValidationError('Category and key are required');
      }

      const value = await preferenceService.getPreference(
        userId,
        category,
        key
      );

      res.status(200).json({
        success: true,
        data: {
          category,
          key,
          value
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user preferences
   * PUT /api/v1/preferences
   * Body: { category: { key: value, ... }, ... }
   */
  async updatePreferences(req, res, next) {
    try {
      const userId = req.user?.userId;
      const updates = req.body;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!updates || Object.keys(updates).length === 0) {
        throw new ValidationError('Preferences data is required');
      }

      const results = await preferenceService.updatePreferences(
        userId,
        updates
      );

      const allPreferences = await preferenceService.getUserPreferences(userId);

      res.status(200).json({
        success: true,
        data: allPreferences,
        message: 'Preferences updated successfully',
        updated: results.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset preferences to defaults
   * DELETE /api/v1/preferences
   */
  async resetPreferences(req, res, next) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const defaultPreferences = await preferenceService.resetToDefaults(userId);

      res.status(200).json({
        success: true,
        data: defaultPreferences,
        message: 'Preferences reset to defaults'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export preferences for backup
   * POST /api/v1/preferences/export
   */
  async exportPreferences(req, res, next) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const exportData = await preferenceService.exportPreferences(userId);

      // Return as file download if requested
      if (req.query.download === 'true') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="preferences-${userId}-${Date.now()}.json"`
        );
        res.send(JSON.stringify(exportData, null, 2));
      } else {
        res.status(200).json({
          success: true,
          data: exportData,
          message: 'Preferences exported successfully'
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Import preferences from backup
   * POST /api/v1/preferences/import
   * Body: { preferences: {...}, notificationPreferences: {...} }
   */
  async importPreferences(req, res, next) {
    try {
      const userId = req.user?.userId;
      const importData = req.body;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!importData || !importData.preferences) {
        throw new ValidationError('Import data with preferences is required');
      }

      const imported = await preferenceService.importPreferences(
        userId,
        importData
      );

      res.status(200).json({
        success: true,
        data: imported,
        message: 'Preferences imported successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Notification Preferences Endpoints
  // ============================================

  /**
   * Get notification preferences
   * GET /api/v1/preferences/notifications
   */
  async getNotificationPreferences(req, res, next) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const notificationPrefs = await preferenceService.getNotificationPreferences(userId);

      res.status(200).json({
        success: true,
        data: notificationPrefs
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update notification preferences
   * PUT /api/v1/preferences/notifications
   * Body: { emailEnabled: boolean, pushEnabled: boolean, ... }
   */
  async updateNotificationPreferences(req, res, next) {
    try {
      const userId = req.user?.userId;
      const updates = req.body;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!updates || Object.keys(updates).length === 0) {
        throw new ValidationError('Notification preferences data is required');
      }

      const updated = await preferenceService.updateNotificationPreferences(
        userId,
        updates
      );

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Notification preferences updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update single notification channel
   * PATCH /api/v1/preferences/notifications/:channel
   * Body: { enabled: boolean }
   */
  async updateNotificationChannel(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { channel } = req.params;
      const { enabled } = req.body;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!channel || enabled === undefined) {
        throw new ValidationError('Channel and enabled status are required');
      }

      // Map channel names to preference keys
      const channelMap = {
        email: 'emailEnabled',
        push: 'pushEnabled',
        sms: 'smsEnabled',
        inApp: 'inAppEnabled'
      };

      const preferenceKey = channelMap[channel];
      if (!preferenceKey) {
        throw new ValidationError(`Invalid channel: ${channel}`);
      }

      const updates = { [preferenceKey]: enabled };
      const updated = await preferenceService.updateNotificationPreferences(
        userId,
        updates
      );

      res.status(200).json({
        success: true,
        data: updated,
        message: `Notification channel '${channel}' updated successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update quiet hours settings
   * PUT /api/v1/preferences/notifications/quiet-hours
   * Body: { enabled: boolean, startTime: "HH:MM", endTime: "HH:MM" }
   */
  async updateQuietHours(req, res, next) {
    try {
      const userId = req.user?.userId;
      const { enabled, startTime, endTime } = req.body;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      // Validate time format if provided
      if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) {
        throw new ValidationError('Start time must be in HH:MM format');
      }

      if (endTime && !/^\d{2}:\d{2}$/.test(endTime)) {
        throw new ValidationError('End time must be in HH:MM format');
      }

      const updates = {
        quietHoursEnabled: enabled,
        quietHoursStart: startTime || null,
        quietHoursEnd: endTime || null
      };

      const updated = await preferenceService.updateNotificationPreferences(
        userId,
        updates
      );

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Quiet hours settings updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PreferencesController();
