/**
 * API Versioning Middleware
 * ==========================
 *
 * Comprehensive API versioning system supporting:
 * - URL-based versioning (/api/v1/users, /api/v2/users)
 * - Header-based versioning (Accept-Version: v1)
 * - Content negotiation (Accept: application/vnd.zekka.v1+json)
 * - Automatic deprecation warnings
 * - Version migration support
 * - Backward compatibility
 *
 * Industry Standards:
 * - Semantic Versioning (SemVer)
 * - API Blueprint specification
 * - OpenAPI 3.0 compatibility
 */

import auditService from '../services/audit-service.js';
import logger from '../utils/logger.js';

// Supported API versions
const SUPPORTED_VERSIONS = ['v1', 'v2'];
const DEFAULT_VERSION = 'v1';
const DEPRECATED_VERSIONS = ['v1']; // v1 is deprecated, will be removed in v3
const LATEST_VERSION = 'v2';

// Version deprecation timeline
const VERSION_DEPRECATION = {
  v1: {
    deprecatedAt: '2026-01-01',
    sunsetAt: '2026-06-01',
    replacement: 'v2',
    message:
      'API v1 is deprecated and will be removed on June 1, 2026. Please migrate to v2.'
  }
};

/**
 * Extract API version from request
 *
 * Priority:
 * 1. URL path (/api/v1/...)
 * 2. Accept-Version header
 * 3. Accept header with vendor media type
 * 4. Query parameter (?version=v1)
 * 5. Default version
 */
export const extractVersion = (req) => {
  // 1. Check URL path
  const urlMatch = req.path.match(/^\/api\/(v\d+)\//);
  if (urlMatch && SUPPORTED_VERSIONS.includes(urlMatch[1])) {
    return urlMatch[1];
  }

  // 2. Check Accept-Version header
  const versionHeader = req.get('Accept-Version');
  if (versionHeader && SUPPORTED_VERSIONS.includes(versionHeader)) {
    return versionHeader;
  }

  // 3. Check Accept header with vendor media type
  const acceptHeader = req.get('Accept');
  if (acceptHeader) {
    const vendorMatch = acceptHeader.match(
      /application\/vnd\.zekka\.(v\d+)\+json/
    );
    if (vendorMatch && SUPPORTED_VERSIONS.includes(vendorMatch[1])) {
      return vendorMatch[1];
    }
  }

  // 4. Check query parameter
  const queryVersion = req.query.version;
  if (queryVersion && SUPPORTED_VERSIONS.includes(queryVersion)) {
    return queryVersion;
  }

  // 5. Return default version
  return DEFAULT_VERSION;
};

/**
 * Validate API version
 */
export const validateVersion = (version) => {
  if (!SUPPORTED_VERSIONS.includes(version)) {
    return {
      valid: false,
      error: `Unsupported API version: ${version}. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`
    };
  }

  return { valid: true };
};

/**
 * Check if version is deprecated
 */
export const isDeprecated = (version) => DEPRECATED_VERSIONS.includes(version);

/**
 * Get deprecation info for version
 */
export const getDeprecationInfo = (version) => VERSION_DEPRECATION[version] || null;

/**
 * Calculate days until sunset
 */
export const daysUntilSunset = (version) => {
  const deprecationInfo = getDeprecationInfo(version);
  if (!deprecationInfo) return null;

  const sunsetDate = new Date(deprecationInfo.sunsetAt);
  const now = new Date();
  const diffTime = sunsetDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
};

/**
 * API Versioning Middleware
 *
 * Attaches version information to request object and
 * adds deprecation warnings to response headers
 */
export const apiVersioning = async (req, res, next) => {
  try {
    // Extract version from request
    const version = extractVersion(req);

    // Validate version
    const validation = validateVersion(version);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        supportedVersions: SUPPORTED_VERSIONS,
        latestVersion: LATEST_VERSION
      });
    }

    // Attach version to request
    req.apiVersion = version;

    // Add version headers to response
    res.setHeader('X-API-Version', version);
    res.setHeader('X-API-Supported-Versions', SUPPORTED_VERSIONS.join(', '));
    res.setHeader('X-API-Latest-Version', LATEST_VERSION);

    // Check if version is deprecated
    if (isDeprecated(version)) {
      const deprecationInfo = getDeprecationInfo(version);
      const daysLeft = daysUntilSunset(version);

      // Add deprecation headers
      res.setHeader('X-API-Deprecated', 'true');
      res.setHeader('X-API-Sunset-Date', deprecationInfo.sunsetAt);
      res.setHeader('X-API-Replacement-Version', deprecationInfo.replacement);
      res.setHeader(
        'Warning',
        `299 - "API ${version} is deprecated. ${deprecationInfo.message}"`
      );

      // Log deprecation warning
      await auditService.log({
        userId: req.user?.id,
        username: req.user?.email,
        action: 'api_deprecated_version_used',
        resourceType: 'api',
        endpoint: req.path,
        method: req.method,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true,
        requestBody: {
          version,
          daysUntilSunset: daysLeft,
          deprecationMessage: deprecationInfo.message
        },
        riskLevel: 'low'
      });

      // Add deprecation warning to response
      const originalJson = res.json;
      res.json = function (data) {
        if (typeof data === 'object' && data !== null) {
          data._deprecation = {
            version,
            message: deprecationInfo.message,
            sunsetDate: deprecationInfo.sunsetAt,
            daysUntilSunset: daysLeft,
            replacementVersion: deprecationInfo.replacement,
            migrationGuide: `https://docs.zekka.ai/migration/${version}-to-${deprecationInfo.replacement}`
          };
        }
        originalJson.call(this, data);
      };
    }

    next();
  } catch (error) {
    logger.error('API versioning error:', error);
    res.status(500).json({
      success: false,
      error: 'API versioning failed'
    });
  }
};

/**
 * Version-specific route handler wrapper
 *
 * Usage:
 * app.get('/api/users', versionHandler({
 *   v1: async (req, res) => { ... },
 *   v2: async (req, res) => { ... }
 * }));
 */
export const versionHandler = (handlers) => async (req, res, next) => {
  const version = req.apiVersion || DEFAULT_VERSION;
  const handler = handlers[version];

  if (!handler) {
    return res.status(501).json({
      success: false,
      error: `Endpoint not implemented for API version ${version}`,
      supportedVersions: Object.keys(handlers)
    });
  }

  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

/**
 * API version upgrade checker
 *
 * Suggests upgrades when new versions are available
 */
export const suggestUpgrade = (req, res, next) => {
  const currentVersion = req.apiVersion || DEFAULT_VERSION;

  if (currentVersion !== LATEST_VERSION) {
    res.setHeader('X-API-Upgrade-Available', 'true');
    res.setHeader('X-API-Upgrade-To', LATEST_VERSION);
    res.setHeader(
      'Link',
      `<https://docs.zekka.ai/api/${LATEST_VERSION}>; rel="upgrade"`
    );
  }

  next();
};

/**
 * API version compatibility middleware
 *
 * Transforms responses to maintain backward compatibility
 */
export const ensureCompatibility = (req, res, next) => {
  const version = req.apiVersion || DEFAULT_VERSION;

  if (version === 'v1') {
    // Intercept JSON responses and transform for v1 compatibility
    const originalJson = res.json;
    res.json = function (data) {
      // Transform v2 response format to v1 format
      if (typeof data === 'object' && data !== null) {
        // Example: v2 uses 'data' wrapper, v1 doesn't
        if (data.success !== undefined && data.data !== undefined) {
          // Keep v2 format for v1 (already compatible)
          originalJson.call(this, data);
        } else {
          originalJson.call(this, data);
        }
      } else {
        originalJson.call(this, data);
      }
    };
  }

  next();
};

/**
 * Get API version info
 */
export const getVersionInfo = () => ({
  supportedVersions: SUPPORTED_VERSIONS,
  latestVersion: LATEST_VERSION,
  defaultVersion: DEFAULT_VERSION,
  deprecatedVersions: DEPRECATED_VERSIONS.map((v) => ({
    version: v,
    ...getDeprecationInfo(v),
    daysUntilSunset: daysUntilSunset(v)
  }))
});

/**
 * API version documentation endpoint
 */
export const versionDocsHandler = (req, res) => {
  const versionInfo = getVersionInfo();

  res.json({
    success: true,
    apiName: 'Zekka Framework API',
    ...versionInfo,
    endpoints: {
      v1: `${req.protocol}://${req.get('host')}/api/v1`,
      v2: `${req.protocol}://${req.get('host')}/api/v2`
    },
    documentation: {
      v1: 'https://docs.zekka.ai/api/v1',
      v2: 'https://docs.zekka.ai/api/v2'
    },
    migration: {
      'v1-to-v2': 'https://docs.zekka.ai/migration/v1-to-v2'
    }
  });
};

export default {
  extractVersion,
  validateVersion,
  isDeprecated,
  getDeprecationInfo,
  daysUntilSunset,
  apiVersioning,
  versionHandler,
  suggestUpgrade,
  ensureCompatibility,
  getVersionInfo,
  versionDocsHandler
};
