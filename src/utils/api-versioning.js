/**
 * API Versioning System
 *
 * Features:
 * - Multiple API version support (v1, v2, etc.)
 * - Backward compatibility
 * - Version deprecation notices
 * - Automatic version detection from URL or headers
 * - Version-specific middleware
 * - Migration helpers
 */

const express = require('express');

// API version configuration
const API_CONFIG = {
  defaultVersion: 'v1',
  supportedVersions: ['v1', 'v2'],
  deprecatedVersions: [],
  versionHeader: 'API-Version',
  deprecationWarningDays: 90
};

class ApiVersionManager {
  constructor(options = {}) {
    this.config = { ...API_CONFIG, ...options };
    this.routers = new Map(); // version -> router
    this.deprecationDates = new Map(); // version -> date
    this.versionMetadata = new Map(); // version -> metadata

    this.initializeVersions();
  }

  /**
   * Initialize API versions
   */
  initializeVersions() {
    for (const version of this.config.supportedVersions) {
      this.routers.set(version, express.Router());
      this.versionMetadata.set(version, {
        version,
        status: this.config.deprecatedVersions.includes(version)
          ? 'deprecated'
          : 'active',
        introduced: new Date(),
        endpoints: []
      });
    }
  }

  /**
   * Get router for specific API version
   */
  getRouter(version) {
    if (!this.routers.has(version)) {
      throw new Error(`API version ${version} is not supported`);
    }
    return this.routers.get(version);
  }

  /**
   * Create version detection middleware
   */
  versionMiddleware() {
    return (req, res, next) => {
      // Extract version from URL path (e.g., /api/v1/users)
      const urlMatch = req.path.match(/^\/api\/(v\d+)\//);
      if (urlMatch) {
        req.apiVersion = urlMatch[1];
      }

      // Or from header
      if (!req.apiVersion && req.get(this.config.versionHeader)) {
        req.apiVersion = req.get(this.config.versionHeader);
      }

      // Use default version if not specified
      if (!req.apiVersion) {
        req.apiVersion = this.config.defaultVersion;
      }

      // Validate version
      if (!this.config.supportedVersions.includes(req.apiVersion)) {
        return res.status(400).json({
          error: 'Unsupported API version',
          requestedVersion: req.apiVersion,
          supportedVersions: this.config.supportedVersions,
          message: `API version '${req.apiVersion}' is not supported. Please use one of: ${this.config.supportedVersions.join(', ')}`
        });
      }

      // Check if version is deprecated
      if (this.config.deprecatedVersions.includes(req.apiVersion)) {
        const deprecationDate = this.deprecationDates.get(req.apiVersion);
        const daysUntilRemoval = deprecationDate
          ? Math.ceil((deprecationDate - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        res.set('Deprecation', 'true');
        res.set('Sunset', deprecationDate?.toISOString() || 'TBD');
        res.set(
          'Link',
          `</api/${this.config.defaultVersion}>; rel="successor-version"`
        );

        if (daysUntilRemoval && daysUntilRemoval > 0) {
          res.set(
            'X-API-Deprecation-Notice',
            `This API version will be removed in ${daysUntilRemoval} days. Please migrate to ${this.config.defaultVersion}`
          );
        }
      }

      // Add version info to response headers
      res.set('API-Version', req.apiVersion);

      next();
    };
  }

  /**
   * Register endpoint for a specific version
   */
  registerEndpoint(version, method, path, ...handlers) {
    const router = this.getRouter(version);
    router[method.toLowerCase()](path, ...handlers);

    // Track endpoint metadata
    const metadata = this.versionMetadata.get(version);
    if (metadata) {
      metadata.endpoints.push({
        method: method.toUpperCase(),
        path,
        registered: new Date()
      });
    }
  }

  /**
   * Register endpoint for all versions
   */
  registerForAllVersions(method, path, ...handlers) {
    for (const version of this.config.supportedVersions) {
      this.registerEndpoint(version, method, path, ...handlers);
    }
  }

  /**
   * Mark version as deprecated
   */
  deprecateVersion(version, removalDate) {
    if (!this.config.supportedVersions.includes(version)) {
      throw new Error(`Cannot deprecate unsupported version: ${version}`);
    }

    if (!this.config.deprecatedVersions.includes(version)) {
      this.config.deprecatedVersions.push(version);
    }

    this.deprecationDates.set(version, removalDate);

    const metadata = this.versionMetadata.get(version);
    if (metadata) {
      metadata.status = 'deprecated';
      metadata.deprecatedAt = new Date();
      metadata.removalDate = removalDate;
    }
  }

  /**
   * Remove deprecated version
   */
  removeVersion(version) {
    if (version === this.config.defaultVersion) {
      throw new Error('Cannot remove default API version');
    }

    this.routers.delete(version);
    this.deprecationDates.delete(version);
    this.versionMetadata.delete(version);

    const versionIndex = this.config.supportedVersions.indexOf(version);
    if (versionIndex > -1) {
      this.config.supportedVersions.splice(versionIndex, 1);
    }

    const deprecatedIndex = this.config.deprecatedVersions.indexOf(version);
    if (deprecatedIndex > -1) {
      this.config.deprecatedVersions.splice(deprecatedIndex, 1);
    }
  }

  /**
   * Get version information
   */
  getVersionInfo(version) {
    return this.versionMetadata.get(version);
  }

  /**
   * Get all versions information
   */
  getAllVersionsInfo() {
    const versions = [];
    for (const [version, metadata] of this.versionMetadata.entries()) {
      versions.push({
        ...metadata,
        isDefault: version === this.config.defaultVersion,
        deprecationDate: this.deprecationDates.get(version)?.toISOString()
      });
    }
    return versions;
  }

  /**
   * Create version info endpoint
   */
  createVersionInfoEndpoint() {
    return (req, res) => {
      const versions = this.getAllVersionsInfo();

      res.json({
        currentVersion: req.apiVersion || this.config.defaultVersion,
        defaultVersion: this.config.defaultVersion,
        supportedVersions: this.config.supportedVersions,
        deprecatedVersions: this.config.deprecatedVersions,
        versions: versions.map((v) => ({
          version: v.version,
          status: v.status,
          isDefault: v.isDefault,
          introduced: v.introduced,
          deprecatedAt: v.deprecatedAt,
          removalDate: v.deprecationDate,
          endpointCount: v.endpoints.length
        }))
      });
    };
  }

  /**
   * Create migration guide endpoint
   */
  createMigrationGuideEndpoint() {
    return (req, res) => {
      const fromVersion = req.query.from || req.apiVersion;
      const toVersion = req.query.to || this.config.defaultVersion;

      if (!this.config.supportedVersions.includes(fromVersion)) {
        return res.status(400).json({
          error: 'Invalid source version'
        });
      }

      if (!this.config.supportedVersions.includes(toVersion)) {
        return res.status(400).json({
          error: 'Invalid target version'
        });
      }

      const guide = this.generateMigrationGuide(fromVersion, toVersion);
      res.json(guide);
    };
  }

  /**
   * Generate migration guide
   */
  generateMigrationGuide(fromVersion, toVersion) {
    const fromMeta = this.versionMetadata.get(fromVersion);
    const toMeta = this.versionMetadata.get(toVersion);

    return {
      from: fromVersion,
      to: toVersion,
      overview: `Migration guide from ${fromVersion} to ${toVersion}`,
      breakingChanges: this.getBreakingChanges(fromVersion, toVersion),
      newFeatures: this.getNewFeatures(fromVersion, toVersion),
      deprecations: this.getDeprecations(fromVersion, toVersion),
      steps: [
        {
          step: 1,
          title: 'Update API version in requests',
          description: `Change API version from ${fromVersion} to ${toVersion} in URL or headers`
        },
        {
          step: 2,
          title: 'Review breaking changes',
          description: 'Update code to handle breaking changes listed above'
        },
        {
          step: 3,
          title: 'Test thoroughly',
          description: 'Test all API calls with the new version'
        },
        {
          step: 4,
          title: 'Deploy gradually',
          description: 'Use canary deployment to minimize risk'
        }
      ]
    };
  }

  /**
   * Get breaking changes between versions
   */
  getBreakingChanges(fromVersion, toVersion) {
    // In a real implementation, this would be configured
    return [];
  }

  /**
   * Get new features between versions
   */
  getNewFeatures(fromVersion, toVersion) {
    // In a real implementation, this would be configured
    return [];
  }

  /**
   * Get deprecations between versions
   */
  getDeprecations(fromVersion, toVersion) {
    // In a real implementation, this would be configured
    return [];
  }

  /**
   * Mount all version routers
   */
  mountRouters(app) {
    for (const [version, router] of this.routers.entries()) {
      app.use(`/api/${version}`, router);
    }
  }
}

/**
 * Version-specific middleware wrapper
 */
function forVersion(version, ...middleware) {
  return (req, res, next) => {
    if (req.apiVersion === version) {
      return middleware[0](req, res, next);
    }
    next();
  };
}

/**
 * Version range middleware wrapper
 */
function forVersionRange(minVersion, maxVersion, ...middleware) {
  return (req, res, next) => {
    const currentVersion = parseInt(req.apiVersion.replace('v', ''));
    const min = parseInt(minVersion.replace('v', ''));
    const max = parseInt(maxVersion.replace('v', ''));

    if (currentVersion >= min && currentVersion <= max) {
      return middleware[0](req, res, next);
    }
    next();
  };
}

/**
 * Exclude version middleware wrapper
 */
function excludeVersion(version, ...middleware) {
  return (req, res, next) => {
    if (req.apiVersion !== version) {
      return middleware[0](req, res, next);
    }
    next();
  };
}

// Singleton instance
let apiVersionManagerInstance = null;

/**
 * Get API version manager instance
 */
function getApiVersionManager(options) {
  if (!apiVersionManagerInstance) {
    apiVersionManagerInstance = new ApiVersionManager(options);
  }
  return apiVersionManagerInstance;
}

module.exports = {
  ApiVersionManager,
  getApiVersionManager,
  forVersion,
  forVersionRange,
  excludeVersion
};
