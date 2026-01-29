/**
 * Astron Agent - Cost Optimization Engine
 * Monitors and optimizes token usage, API costs, and resource allocation
 */

const EventEmitter = require('events');

class CostOptimizer extends EventEmitter {
  constructor(contextBus, logger, tokenEconomics, config = {}) {
    super();
    this.contextBus = contextBus;
    this.logger = logger;
    this.tokenEconomics = tokenEconomics;
    this.config = {
      targetCostReduction: config.targetCostReduction || 30, // percentage
      budgetAlertThreshold: config.budgetAlertThreshold || 80, // percentage
      optimizationInterval: config.optimizationInterval || 3600000, // 1 hour
      ...config
    };

    this.costTracking = {
      hourly: [],
      daily: [],
      monthly: []
    };

    this.optimizationHistory = [];
    this.isMonitoring = false;
  }

  /**
   * Start cost monitoring and optimization
   */
  async startMonitoring() {
    this.logger.info('[Astron:Cost] Starting cost monitoring...');
    this.isMonitoring = true;

    // Start periodic optimization
    this.optimizationTimer = setInterval(
      () => this.runOptimization(),
      this.config.optimizationInterval
    );

    // Monitor budget thresholds
    this.budgetMonitor = setInterval(
      () => this.checkBudgetThresholds(),
      60000 // Check every minute
    );

    await this.contextBus.publish('astron.cost.monitoring-started', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Stop cost monitoring
   */
  async stopMonitoring() {
    this.logger.info('[Astron:Cost] Stopping cost monitoring...');
    this.isMonitoring = false;

    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
    }

    if (this.budgetMonitor) {
      clearInterval(this.budgetMonitor);
    }
  }

  /**
   * Run cost optimization analysis
   */
  async runOptimization() {
    this.logger.info('[Astron:Cost] Running cost optimization...');

    try {
      // Get current cost metrics
      const metrics = await this.tokenEconomics.getCostSummary({
        period: 'day'
      });

      // Analyze cost patterns
      const analysis = this.analyzeCostPatterns(metrics);

      // Generate optimization recommendations
      const recommendations = this.generateCostOptimizations(analysis);

      // Apply automatic optimizations
      const applied = await this.applyOptimizations(recommendations);

      // Record optimization
      this.optimizationHistory.push({
        timestamp: new Date().toISOString(),
        metrics,
        recommendations,
        applied,
        savings: applied.reduce(
          (sum, opt) => sum + (opt.estimatedSavings || 0),
          0
        )
      });

      // Publish results
      await this.contextBus.publish('astron.cost.optimization-complete', {
        recommendations: recommendations.length,
        applied: applied.length,
        estimatedSavings: applied.reduce(
          (sum, opt) => sum + (opt.estimatedSavings || 0),
          0
        ),
        timestamp: new Date().toISOString()
      });

      return {
        recommendations,
        applied,
        analysis
      };
    } catch (error) {
      this.logger.error('[Astron:Cost] Optimization failed:', error);
      throw error;
    }
  }

  /**
   * Analyze cost patterns
   */
  analyzeCostPatterns(metrics) {
    const analysis = {
      trends: {},
      anomalies: [],
      inefficiencies: [],
      opportunities: []
    };

    // Analyze trends
    if (metrics.totalCost) {
      const avgCost = metrics.totalCost / (metrics.requestCount || 1);
      analysis.trends.avgCostPerRequest = avgCost;

      // Compare with historical data
      if (this.costTracking.daily.length > 7) {
        const historicalAvg = this.costTracking.daily
          .slice(-7)
          .reduce((sum, d) => sum + d.avgCost, 0) / 7;

        if (avgCost > historicalAvg * 1.2) {
          analysis.anomalies.push({
            type: 'cost-spike',
            severity: 'high',
            current: avgCost,
            expected: historicalAvg,
            increase: `${(((avgCost - historicalAvg) / historicalAvg) * 100).toFixed(2)}%`
          });
        }
      }
    }

    // Identify inefficiencies
    if (metrics.breakdown) {
      for (const [category, cost] of Object.entries(metrics.breakdown)) {
        const percentage = (cost / metrics.totalCost) * 100;
        if (percentage > 40) {
          analysis.inefficiencies.push({
            category,
            cost,
            percentage: `${percentage.toFixed(2)}%`,
            suggestion: `High cost concentration in ${category}`
          });
        }
      }
    }

    // Identify optimization opportunities
    analysis.opportunities = this.identifyOpportunities(metrics);

    return analysis;
  }

  /**
   * Generate cost optimization recommendations
   */
  generateCostOptimizations(analysis) {
    const recommendations = [];

    // Address anomalies
    for (const anomaly of analysis.anomalies) {
      recommendations.push({
        type: 'anomaly-resolution',
        priority: anomaly.severity,
        title: 'Investigate cost spike',
        description: `Cost has increased by ${anomaly.increase}`,
        action: 'Review recent changes and optimize high-cost operations',
        estimatedSavings: anomaly.current - anomaly.expected,
        autoApplicable: false
      });
    }

    // Address inefficiencies
    for (const inefficiency of analysis.inefficiencies) {
      recommendations.push({
        type: 'efficiency-improvement',
        priority: 'high',
        title: `Optimize ${inefficiency.category}`,
        description: `${inefficiency.category} accounts for ${inefficiency.percentage} of total cost`,
        action: 'Implement caching and reduce redundant operations',
        estimatedSavings: inefficiency.cost * 0.3, // 30% potential savings
        autoApplicable: true
      });
    }

    // Leverage opportunities
    for (const opportunity of analysis.opportunities) {
      recommendations.push(opportunity);
    }

    return recommendations.sort(
      (a, b) => b.estimatedSavings - a.estimatedSavings
    );
  }

  /**
   * Identify cost optimization opportunities
   */
  identifyOpportunities(metrics) {
    const opportunities = [];

    // Opportunity: Batch processing
    if (metrics.requestCount > 1000) {
      opportunities.push({
        type: 'batching',
        priority: 'medium',
        title: 'Implement request batching',
        description:
          'High request volume detected - batching could reduce costs',
        action: 'Batch similar requests to reduce API calls',
        estimatedSavings: metrics.totalCost * 0.15, // 15% savings
        autoApplicable: true
      });
    }

    // Opportunity: Caching
    opportunities.push({
      type: 'caching',
      priority: 'high',
      title: 'Implement result caching',
      description:
        'Cache frequently requested results to avoid redundant API calls',
      action: 'Enable Redis caching for common queries',
      estimatedSavings: metrics.totalCost * 0.25, // 25% savings
      autoApplicable: true
    });

    // Opportunity: Model selection
    opportunities.push({
      type: 'model-optimization',
      priority: 'medium',
      title: 'Optimize model selection',
      description: 'Use smaller, more efficient models for simple tasks',
      action:
        'Route simple tasks to cheaper models (e.g., GPT-3.5 instead of GPT-4)',
      estimatedSavings: metrics.totalCost * 0.2, // 20% savings
      autoApplicable: false
    });

    return opportunities;
  }

  /**
   * Apply optimizations automatically
   */
  async applyOptimizations(recommendations) {
    const applied = [];

    for (const rec of recommendations.filter((r) => r.autoApplicable)) {
      try {
        this.logger.info(`[Astron:Cost] Applying optimization: ${rec.title}`);

        switch (rec.type) {
        case 'batching':
          await this.enableBatching();
          applied.push(rec);
          break;

        case 'caching':
          await this.enableCaching();
          applied.push(rec);
          break;

        case 'efficiency-improvement':
          await this.optimizeCategory(rec);
          applied.push(rec);
          break;

        default:
          this.logger.warn(
            `[Astron:Cost] Unknown optimization type: ${rec.type}`
          );
        }
      } catch (error) {
        this.logger.error(
          `[Astron:Cost] Failed to apply optimization ${rec.title}:`,
          error
        );
      }
    }

    return applied;
  }

  /**
   * Check budget thresholds
   */
  async checkBudgetThresholds() {
    const metrics = await this.tokenEconomics.getCostSummary({ period: 'day' });

    // Get budget limits
    const dailyBudget = this.tokenEconomics.dailyBudget || 50;
    const monthlyBudget = this.tokenEconomics.monthlyBudget || 1000;

    const dailyUsage = (metrics.totalCost / dailyBudget) * 100;

    if (dailyUsage >= this.config.budgetAlertThreshold) {
      this.logger.warn(
        `[Astron:Cost] Budget alert: ${dailyUsage.toFixed(2)}% of daily budget used`
      );

      await this.contextBus.publish('astron.cost.budget-alert', {
        level: dailyUsage >= 95 ? 'critical' : 'warning',
        dailyUsage: `${dailyUsage.toFixed(2)}%`,
        currentCost: metrics.totalCost,
        dailyBudget,
        timestamp: new Date().toISOString()
      });

      this.emit('budgetAlert', {
        level: dailyUsage >= 95 ? 'critical' : 'warning',
        dailyUsage,
        currentCost: metrics.totalCost,
        dailyBudget
      });
    }
  }

  /**
   * Get cost statistics
   */
  async getStatistics() {
    const metrics = await this.tokenEconomics.getCostSummary({ period: 'all' });

    const totalSavings = this.optimizationHistory.reduce(
      (sum, opt) => sum + (opt.savings || 0),
      0
    );

    return {
      currentMetrics: metrics,
      totalOptimizations: this.optimizationHistory.length,
      totalSavings,
      avgSavingsPerOptimization:
        totalSavings / (this.optimizationHistory.length || 1),
      recentOptimizations: this.optimizationHistory.slice(-10)
    };
  }

  /**
   * Helper methods for applying optimizations
   */
  async enableBatching() {
    await this.contextBus.set('astron:config:batching', 'enabled');
    this.logger.info('[Astron:Cost] Request batching enabled');
  }

  async enableCaching() {
    await this.contextBus.set('astron:config:caching', 'enabled');
    this.logger.info('[Astron:Cost] Result caching enabled');
  }

  async optimizeCategory(recommendation) {
    // Store optimization config
    await this.contextBus.set(
      `astron:optimization:${recommendation.category}`,
      JSON.stringify({
        enabled: true,
        target: recommendation.category,
        appliedAt: new Date().toISOString()
      })
    );
    this.logger.info(
      `[Astron:Cost] Optimized category: ${recommendation.category}`
    );
  }
}

module.exports = CostOptimizer;
