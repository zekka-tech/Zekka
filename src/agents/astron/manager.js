/**
 * Astron Agent Manager
 * Coordinates cost optimization, security monitoring, and scalability optimization
 * The three pillars of system health and efficiency
 */

const CostOptimizer = require('./cost-optimizer');
const SecurityMonitor = require('./security-monitor');
const ScalabilityOptimizer = require('./scalability-optimizer');

class AstronManager {
  constructor(contextBus, logger, tokenEconomics, config = {}) {
    this.contextBus = contextBus;
    this.logger = logger;
    this.tokenEconomics = tokenEconomics;
    this.config = config;

    // Initialize the three pillars
    this.costOptimizer = new CostOptimizer(
      contextBus,
      logger,
      tokenEconomics,
      config.cost || {}
    );

    this.securityMonitor = new SecurityMonitor(
      contextBus,
      logger,
      config.security || {}
    );

    this.scalabilityOptimizer = new ScalabilityOptimizer(
      contextBus,
      logger,
      config.scalability || {}
    );

    this.isInitialized = false;
    this.healthStatus = {
      cost: 'unknown',
      security: 'unknown',
      scalability: 'unknown',
      overall: 'unknown'
    };
  }

  /**
   * Initialize Astron Agent system
   */
  async initialize() {
    this.logger.info('[Astron] Initializing Astron Agent system...');

    try {
      // Start all monitors
      await this.costOptimizer.startMonitoring();
      this.logger.info('[Astron] Cost Optimizer started');

      await this.securityMonitor.startMonitoring();
      this.logger.info('[Astron] Security Monitor started');

      await this.scalabilityOptimizer.startMonitoring();
      this.logger.info('[Astron] Scalability Optimizer started');

      // Setup health monitoring
      this.setupHealthMonitoring();

      // Setup inter-component communication
      this.setupCommunication();

      this.isInitialized = true;
      this.logger.info('[Astron] Astron Agent system initialized successfully');

      // Publish initialization event
      await this.contextBus.publish('astron.initialized', {
        components: ['cost', 'security', 'scalability'],
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      this.logger.error('[Astron] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Setup health monitoring
   */
  setupHealthMonitoring() {
    this.healthCheckInterval = setInterval(
      () => this.performHealthCheck(),
      300000 // Every 5 minutes
    );
  }

  /**
   * Setup communication between components
   */
  setupCommunication() {
    // Cost optimizer alerts security monitor about suspicious spending patterns
    this.costOptimizer.on('budgetAlert', async (data) => {
      this.logger.warn('[Astron] Budget alert received:', data);
      // Could trigger security scan for potential abuse
    });

    // Security monitor alerts cost optimizer about potential security costs
    this.securityMonitor.on('threatDetected', async (threat) => {
      this.logger.warn('[Astron] Security threat detected:', threat);
      // Could impact cost projections
    });

    // Scalability optimizer coordinates with cost optimizer
    this.scalabilityOptimizer.on('scalingEvent', async (event) => {
      this.logger.info('[Astron] Scaling event:', event);
      // Impacts cost projections
    });
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    this.logger.info('[Astron] Performing health check...');

    const health = {
      timestamp: new Date().toISOString(),
      components: {},
      overall: 'healthy',
      alerts: [],
      recommendations: []
    };

    try {
      // Check cost health
      const costStats = await this.costOptimizer.getStatistics();
      health.components.cost = {
        status: this.assessCostHealth(costStats),
        metrics: costStats
      };

      // Check security health
      const securityStats = this.securityMonitor.getStatistics();
      health.components.security = {
        status: this.assessSecurityHealth(securityStats),
        metrics: securityStats
      };

      // Check scalability health
      const scalabilityStats = this.scalabilityOptimizer.getStatistics();
      health.components.scalability = {
        status: this.assessScalabilityHealth(scalabilityStats),
        metrics: scalabilityStats
      };

      // Determine overall health
      const statuses = Object.values(health.components).map((c) => c.status);
      if (statuses.includes('critical')) {
        health.overall = 'critical';
      } else if (statuses.includes('warning')) {
        health.overall = 'warning';
      } else if (statuses.includes('degraded')) {
        health.overall = 'degraded';
      } else {
        health.overall = 'healthy';
      }

      // Generate alerts and recommendations
      health.alerts = this.generateAlerts(health.components);
      health.recommendations = this.generateRecommendations(health.components);

      this.healthStatus = {
        cost: health.components.cost.status,
        security: health.components.security.status,
        scalability: health.components.scalability.status,
        overall: health.overall
      };

      // Publish health status
      await this.contextBus.publish('astron.health-check', health);

      return health;
    } catch (error) {
      this.logger.error('[Astron] Health check failed:', error);
      return {
        timestamp: new Date().toISOString(),
        overall: 'error',
        error: error.message
      };
    }
  }

  /**
   * Assess component health
   */
  assessCostHealth(stats) {
    if (!stats.currentMetrics) return 'unknown';

    const budgetUsage = (stats.currentMetrics.totalCost / 50) * 100; // Assuming daily budget of 50

    if (budgetUsage >= 95) return 'critical';
    if (budgetUsage >= 80) return 'warning';
    if (budgetUsage >= 60) return 'degraded';
    return 'healthy';
  }

  assessSecurityHealth(stats) {
    if (stats.averageSecurityScore >= 90) return 'healthy';
    if (stats.averageSecurityScore >= 75) return 'degraded';
    if (stats.averageSecurityScore >= 60) return 'warning';
    return 'critical';
  }

  assessScalabilityHealth(stats) {
    if (stats.averageResponseTime <= 100) return 'healthy';
    if (stats.averageResponseTime <= 200) return 'degraded';
    if (stats.averageResponseTime <= 500) return 'warning';
    return 'critical';
  }

  /**
   * Generate alerts
   */
  generateAlerts(components) {
    const alerts = [];

    if (
      components.cost.status === 'critical'
      || components.cost.status === 'warning'
    ) {
      alerts.push({
        component: 'cost',
        severity: components.cost.status,
        message: 'Budget threshold exceeded',
        action: 'Review and optimize costs immediately'
      });
    }

    if (components.security.status === 'critical') {
      alerts.push({
        component: 'security',
        severity: 'critical',
        message: 'Critical security issues detected',
        action: 'Address vulnerabilities immediately'
      });
    }

    if (
      components.scalability.status === 'critical'
      || components.scalability.status === 'warning'
    ) {
      alerts.push({
        component: 'scalability',
        severity: components.scalability.status,
        message: 'Performance degradation detected',
        action: 'Scale resources or optimize performance'
      });
    }

    return alerts;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(components) {
    const recommendations = [];

    // Cost recommendations
    if (components.cost.metrics.totalOptimizations < 5) {
      recommendations.push({
        component: 'cost',
        priority: 'medium',
        title: 'Run more cost optimizations',
        description: 'Regular optimization can reduce costs by 20-30%'
      });
    }

    // Security recommendations
    if (components.security.metrics.activeVulnerabilities > 0) {
      recommendations.push({
        component: 'security',
        priority: 'high',
        title: 'Address active vulnerabilities',
        description: `${components.security.metrics.activeVulnerabilities} vulnerabilities need attention`
      });
    }

    // Scalability recommendations
    const { scalingEvents } = components.scalability.metrics;
    if (scalingEvents && scalingEvents.scaleUp > scalingEvents.scaleDown * 2) {
      recommendations.push({
        component: 'scalability',
        priority: 'medium',
        title: 'Consider permanent capacity increase',
        description: 'Frequent scale-up events indicate growing demand'
      });
    }

    return recommendations;
  }

  /**
   * Get comprehensive status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      health: this.healthStatus,
      components: {
        costOptimizer: {
          monitoring: this.costOptimizer.isMonitoring
        },
        securityMonitor: {
          monitoring: this.securityMonitor.isMonitoring
        },
        scalabilityOptimizer: {
          monitoring: this.scalabilityOptimizer.isMonitoring
        }
      }
    };
  }

  /**
   * Get comprehensive metrics
   */
  async getMetrics() {
    return {
      timestamp: new Date().toISOString(),
      cost: await this.costOptimizer.getStatistics(),
      security: this.securityMonitor.getStatistics(),
      scalability: this.scalabilityOptimizer.getStatistics()
    };
  }

  /**
   * Run comprehensive optimization
   */
  async runComprehensiveOptimization() {
    this.logger.info('[Astron] Running comprehensive optimization...');

    const results = {
      timestamp: new Date().toISOString(),
      optimizations: {}
    };

    try {
      // Run cost optimization
      results.optimizations.cost = await this.costOptimizer.runOptimization();

      // Run security scan
      results.optimizations.security = await this.securityMonitor.runSecurityScan();

      // Run performance analysis
      results.optimizations.scalability = await this.scalabilityOptimizer.analyzePerformance();

      // Publish comprehensive results
      await this.contextBus.publish('astron.comprehensive-optimization', {
        cost: results.optimizations.cost.applied.length,
        security: results.optimizations.security.score,
        scalability: results.optimizations.scalability.bottlenecks.length,
        timestamp: results.timestamp
      });

      return results;
    } catch (error) {
      this.logger.error('[Astron] Comprehensive optimization failed:', error);
      throw error;
    }
  }

  /**
   * Shutdown Astron Agent system
   */
  async shutdown() {
    this.logger.info('[Astron] Shutting down Astron Agent system...');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    await this.costOptimizer.stopMonitoring();
    await this.securityMonitor.stopMonitoring();
    await this.scalabilityOptimizer.stopMonitoring();

    this.isInitialized = false;
    this.logger.info('[Astron] Astron Agent system shut down successfully');
  }
}

module.exports = AstronManager;
