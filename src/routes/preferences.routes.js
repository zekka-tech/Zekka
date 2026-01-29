/**
 * Preferences Routes
 * API routes for user preferences and notification settings
 *
 * Endpoints:
 * GET    /api/v1/preferences                 - Get all preferences
 * GET    /api/v1/preferences/:category       - Get category preferences
 * GET    /api/v1/preferences/:category/:key  - Get specific preference
 * PUT    /api/v1/preferences                 - Update preferences
 * DELETE /api/v1/preferences                 - Reset to defaults
 * POST   /api/v1/preferences/export          - Export preferences
 * POST   /api/v1/preferences/import          - Import preferences
 * GET    /api/v1/preferences/notifications   - Get notification preferences
 * PUT    /api/v1/preferences/notifications   - Update notification preferences
 * PATCH  /api/v1/preferences/notifications/:channel - Update notification channel
 * PUT    /api/v1/preferences/notifications/quiet-hours - Update quiet hours
 */

const express = require('express');
const router = express.Router();
const preferencesController = require('../controllers/preferences.controller');
const preferencesSchemas = require('../schemas/preferences.schema');
const { validateBody, validateQuery, validateParams } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

// Apply authentication to all preference routes
router.use(authenticate);

/**
 * @route   GET /api/v1/preferences
 * @desc    Get all user preferences
 * @access  Private
 * @returns {Object} User preferences object with categories
 */
router.get(
  '/',
  preferencesController.getPreferences
);

/**
 * @route   GET /api/v1/preferences/:category
 * @desc    Get preferences for a specific category (ui, notifications, privacy, performance)
 * @access  Private
 * @param   {string} category - Preference category
 * @returns {Object} Category preferences
 */
router.get(
  '/:category',
  validateParams(preferencesSchemas.categoryParam),
  preferencesController.getPreferenceCategory
);

/**
 * @route   GET /api/v1/preferences/:category/:key
 * @desc    Get a specific preference value
 * @access  Private
 * @param   {string} category - Preference category
 * @param   {string} key - Preference key
 * @returns {*} Preference value
 */
router.get(
  '/:category/:key',
  validateParams(preferencesSchemas.preferenceKeyParam),
  preferencesController.getPreference
);

/**
 * @route   PUT /api/v1/preferences
 * @desc    Update multiple preferences at once
 * @access  Private
 * @body    {Object} Nested object with category/key/value structure
 * @example
 *   {
 *     "ui": { "theme": "dark", "fontSize": "large" },
 *     "notifications": { "emailSummary": false }
 *   }
 * @returns {Object} Updated preferences
 */
router.put(
  '/',
  validateBody(preferencesSchemas.updatePreferences),
  preferencesController.updatePreferences
);

/**
 * @route   DELETE /api/v1/preferences
 * @desc    Reset all preferences to default values
 * @access  Private
 * @returns {Object} Default preferences
 */
router.delete(
  '/',
  preferencesController.resetPreferences
);

/**
 * @route   POST /api/v1/preferences/export
 * @desc    Export all preferences for backup/transfer
 * @access  Private
 * @query   {boolean} [download=false] - Download as file instead of JSON response
 * @returns {Object} Preferences export with metadata
 */
router.post(
  '/export',
  preferencesController.exportPreferences
);

/**
 * @route   POST /api/v1/preferences/import
 * @desc    Import preferences from backup
 * @access  Private
 * @body    {Object} preferences - Exported preferences data
 * @example
 *   {
 *     "preferences": { "ui": {...}, "notifications": {...} },
 *     "notificationPreferences": {...}
 *   }
 * @returns {Object} Imported preferences
 */
router.post(
  '/import',
  validateBody(preferencesSchemas.importPreferences),
  preferencesController.importPreferences
);

/**
 * @route   GET /api/v1/preferences/notifications
 * @desc    Get notification preferences
 * @access  Private
 * @returns {Object} Notification preferences
 */
router.get(
  '/notifications',
  preferencesController.getNotificationPreferences
);

/**
 * @route   PUT /api/v1/preferences/notifications
 * @desc    Update notification preferences
 * @access  Private
 * @body    {Object} Notification preference fields to update
 * @example
 *   {
 *     "emailEnabled": true,
 *     "pushEnabled": false,
 *     "digestFrequency": "daily"
 *   }
 * @returns {Object} Updated notification preferences
 */
router.put(
  '/notifications',
  validateBody(preferencesSchemas.updateNotificationPreferences),
  preferencesController.updateNotificationPreferences
);

/**
 * @route   PATCH /api/v1/preferences/notifications/:channel
 * @desc    Enable/disable a specific notification channel
 * @access  Private
 * @param   {string} channel - Channel name (email, push, sms, inApp)
 * @body    {boolean} enabled - Enable or disable the channel
 * @returns {Object} Updated notification preferences
 */
router.patch(
  '/notifications/:channel',
  validateParams(preferencesSchemas.notificationChannelParam),
  validateBody(preferencesSchemas.updateNotificationChannel),
  preferencesController.updateNotificationChannel
);

/**
 * @route   PUT /api/v1/preferences/notifications/quiet-hours
 * @desc    Update quiet hours settings
 * @access  Private
 * @body    {boolean} enabled - Enable/disable quiet hours
 * @body    {string} [startTime] - Start time in HH:MM format
 * @body    {string} [endTime] - End time in HH:MM format
 * @example
 *   {
 *     "enabled": true,
 *     "startTime": "22:00",
 *     "endTime": "08:00"
 *   }
 * @returns {Object} Updated notification preferences
 */
router.put(
  '/notifications/quiet-hours',
  validateBody(preferencesSchemas.updateQuietHours),
  preferencesController.updateQuietHours
);

module.exports = router;
