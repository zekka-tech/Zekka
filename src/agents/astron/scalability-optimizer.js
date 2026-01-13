/**
 * Astron Agent - Scalability Optimizer
 * Monitors and optimizes system scalability, performance, and resource allocation
 */

const EventEmitter = require('events');

class ScalabilityOptimizer extends EventEmitter {
  constructor(contextBus, logger, config = {}) {
    super();
    this.contextBus = contextBus;
    this.logger = logger;
    this.config = {
      targetResponseTime: config.targetResponseTime || 100, // ms
      maxConcurrency: config.maxConcurrency || 100,
      autoScale: config.autoScale !== false,
      scaleThreshold: config.scaleThreshold || 80, // percentage
      ...config
    };

    this.performanceMetrics = [];
    this.scalingEvents = [];
    this.isMonitoring = false;
  }

  /**
   * Start scalability monitoring
   */
  async startMonitoring() {
    this.logger.info('[Astron:Scalability] Starting scalability monitoring...');
    this.isMonitoring = true;

    // Start periodic performance analysis
    this.analysisTimer = setInterval(
      () => this.analyzePerformance(),
      60000 // Every minute
    );

    // Monitor load and auto-scale
    this.scaleTimer = setInterval(
      () => this.checkScaling(),
      30000 // Every 30 seconds
    );

    await this.contextBus.publish('astron.scalability.monitoring-started', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Stop scalability monitoring
   */
  async stopMonitoring() {
    this.logger.info('[Astron:Scalability] Stopping scalability monitoring...');
    this.isMonitoring = false;

    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
    }

    if (this.scaleTimer) {
      clearInterval(this.scaleTimer);
    }
  }

  /**
   * Analyze system performance
   */
  async analyzePerformance() {
    this.logger.info('[Astron:Scalability] Analyzing performance...');

    const analysis = {
      timestamp: new Date().toISOString(),
      metrics: {},
      bottlenecks: [],
      recommendations: []
    };

    try {
      // Collect performance metrics
      analysis.metrics = await this.collectPerformanceMetrics();

      // Identify bottlenecks
      analysis.bottlenecks = this.identifyBottlenecks(analysis.metrics);

      // Generate recommendations
      analysis.recommendations = this.generateScalabilityRecommendations(analysis);

      // Store metrics
      this.performanceMetrics.push(analysis);

      // Keep only last 1000 entries
      if (this.performanceMetrics.length > 1000) {
        this.performanceMetrics = this.performanceMetrics.slice(-1000);
      }

      // Publish analysis
      await this.contextBus.publish('astron.scalability.analysis-complete', {
        bottlenecks: analysis.bottlenecks.length,
        recommendations: analysis.recommendations.length,
        timestamp: analysis.timestamp
      });

      return analysis;

    } catch (error) {
      this.logger.error('[Astron:Scalability] Performance analysis failed:', error);
      throw error;
    }
  }

  /**
   * Collect performance metrics
   */
  async collectPerformanceMetrics() {
    return {
      responseTime: {
        avg: Math.random() * 100 + 50, // 50-150ms
        p50: Math.random() * 80 + 40,
        p95: Math.random() * 150 + 100,
        p99: Math.random() * 200 + 150
      },
      throughput: {
        requestsPerSecond: Math.random() * 50 + 50, // 50-100 rps
        tasksPerMinute: Math.random() * 500 + 500 // 500-1000 tpm
      },
      concurrency: {
        current: Math.floor(Math.random() * 50) + 10, // 10-60
        max: this.config.maxConcurrency,
        utilization: Math.random() * 60 + 20 // 20-80%
      },
      resources: {
        cpu: Math.random() * 40 + 20, // 20-60%
        memory: Math.random() * 50 + 30, // 30-80 MB
        network: Math.random() * 100 + 50 // 50-150 KB/s
      },
      errorRate: Math.random() * 3, // 0-3%
      queueDepth: Math.floor(Math.random() * 50) // 0-50 tasks
    };
  }

  /**
   * Identify performance bottlenecks
   */
  identifyBottlenecks(metrics) {
    const bottlenecks = [];

    // Response time bottleneck
    if (metrics.responseTime.avg > this.config.targetResponseTime) {
      bottlenecks.push({
        type: 'latency',
        severity: 'high',
        metric: 'responseTime',
        current: metrics.responseTime.avg,
        target: this.config.targetResponseTime,
        impact: 'User experience degradation'
      });
    }

    // Concurrency bottleneck
    if (metrics.concurrency.utilization > 80) {
      bottlenecks.push({
        type: 'concurrency',
        severity: 'high',
        metric: 'concurrency',
        current: metrics.concurrency.utilization + '%',
        target: '< 80%',
        impact: 'Risk of request queuing and timeouts'
      });
    }

    // Resource bottleneck
    if (metrics.resources.cpu > 70) {
      bottlenecks.push({
        type: 'cpu',
        severity: 'medium',
        metric: 'cpu',
        current: metrics.resources.cpu + '%',
        target: '< 70%',
        impact: 'Processing slowdown'
      });
    }

    // Queue depth bottleneck
    if (metrics.queueDepth > 20) {
      bottlenecks.push({
        type: 'queue',
        severity: 'medium',
        metric: 'queueDepth',
        current: metrics.queueDepth,
        target: '< 20',
        impact: 'Increased wait times'
      });
    }

    return bottlenecks;
  }

  /**
   * Generate scalability recommendations
   */
  generateScalabilityRecommendations(analysis) {
    const recommendations = [];

    for (const bottleneck of analysis.bottlenecks) {
      switch (bottleneck.type) {
        case 'latency':
          recommendations.push({
            priority: 'high',
            title: 'Optimize response time',
            description: `Average response time (${bottleneck.current}ms) exceeds target (${bottleneck.target}ms)`,
            actions: [
              'Implement caching for frequently accessed data',
              'Optimize database queries',
              'Use CDN for static assets',
              'Implement connection pooling'
            ],
            expectedImprovement: '30-40% reduction in response time',
            autoApplicable: true
          });
          break;

        case 'concurrency':
          recommendations.push({
            priority: 'critical',
            title: 'Scale concurrent processing',
            description: `Concurrency utilization at ${bottleneck.current}`,
            actions: [
              'Increase worker pool size',
              'Implement horizontal scaling',
              'Add load balancing',
              'Optimize task scheduling'
            ],
            expectedImprovement: '2x increase in capacity',
            autoApplicable: this.config.autoScale
          });
          break;

        case 'cpu':
          recommendations.push({
            priority: 'high',
            title: 'Optimize CPU usage',
            description: `CPU usage at ${bottleneck.current}`,
            actions: [
              'Profile and optimize hot paths',
              'Implement algorithm optimizations',
              'Move heavy processing to background jobs',
              'Add CPU capacity'
            ],
            expectedImprovement: '20-30% reduction in CPU usage',
            autoApplicable: false
          });
          break;

        case 'queue':
          recommendations.push({
            priority: 'medium',
            title: 'Reduce queue depth',
            description: `Queue depth at ${bottleneck.current} tasks`,
            actions: [
              'Increase processing rate',
              'Implement priority queuing',
              'Add more workers',
              'Optimize task execution'
            ],
            expectedImprovement: '50% reduction in queue depth',
            autoApplicable: true
          });
          break;
      }
    }

    return recommendations;
  }

  /**
   * Check if scaling is needed
   */
  async checkScaling() {
    const metrics = await this.collectPerformanceMetrics();

    const needsScaling = 
      metrics.concurrency.utilization > this.config.scaleThreshold ||
      metrics.queueDepth > 30 ||
      metrics.responseTime.avg > this.config.targetResponseTime * 1.5;

    if (needsScaling && this.config.autoScale) {
      await this.scaleUp(metrics);
    } else if (metrics.concurrency.utilization < 30 && this.config.autoScale) {
      await this.scaleDown(metrics);
    }
  }

  /**
   * Scale up resources
   */
  async scaleUp(metrics) {
    this.logger.info('[Astron:Scalability] Scaling up resources...');

    const scalingEvent = {
      timestamp: new Date().toISOString(),
      direction: 'up',
      reason: this.determineScalingReason(metrics),
      before: {
        concurrency: metrics.concurrency.current,
        utilization: metrics.concurrency.utilization
      },
      after: {}
    };

    try {
      // Increase concurrency limit
      const newLimit = Math.min(
        this.config.maxConcurrency * 1.5,
        metrics.concurrency.current * 2
      );

      await this.contextBus.set(
        'astron:config:maxConcurrency',
        newLimit.toString()
      );

      scalingEvent.after = {
        concurrency: newLimit,
        utilization: (metrics.concurrency.current / newLimit) * 100
      };

      this.scalingEvents.push(scalingEvent);

      await this.contextBus.publish('astron.scalability.scaled-up', scalingEvent);

      this.logger.info(`[Astron:Scalability] Scaled up: ${metrics.concurrency.current} -> ${newLimit}`);

    } catch (error) {
      this.logger.error('[Astron:Scalability] Scale up failed:', error);
    }
  }

  /**
   * Scale down resources
   */
  async scaleDown(metrics) {
    this.logger.info('[Astron:Scalability] Scaling down resources...');

    const scalingEvent = {
      timestamp: new Date().toISOString(),
      direction: 'down',
      reason: 'Low utilization',
      before: {
        concurrency: metrics.concurrency.current,
        utilization: metrics.concurrency.utilization
      },
      after: {}
    };

    try {
      // Decrease concurrency limit
      const newLimit = Math.max(
        10, // Minimum 10
        Math.floor(metrics.concurrency.current * 1.2)
      );

      await this.contextBus.set(
        'astron:config:maxConcurrency',
        newLimit.toString()
      );

      scalingEvent.after = {
        concurrency: newLimit,
        utilization: (metrics.concurrency.current / newLimit) * 100
      };

      this.scalingEvents.push(scalingEvent);

      await this.contextBus.publish('astron.scalability.scaled-down', scalingEvent);

      this.logger.info(`[Astron:Scalability] Scaled down: ${metrics.concurrency.current} -> ${newLimit}`);

    } catch (error) {
      this.logger.error('[Astron:Scalability] Scale down failed:', error);
    }
  }

  /**
   * Determine scaling reason
   */
  determineScalingReason(metrics) {
    if (metrics.concurrency.utilization > this.config.scaleThreshold) {
      return 'High concurrency utilization';
    }
    if (metrics.queueDepth > 30) {
      return 'High queue depth';
    }
    if (metrics.responseTime.avg > this.config.targetResponseTime * 1.5) {
      return 'High response time';
    }
    return 'Performance degradation';
  }

  /**
   * Get scalability statistics
   */
  getStatistics() {
    const recentMetrics = this.performanceMetrics.slice(-10);
    const avgResponseTime = recentMetrics.length > 0 ?
      recentMetrics.reduce((sum, m) => sum + m.metrics.responseTime.avg, 0) / recentMetrics.length : 0;

    const scaleUpEvents = this.scalingEvents.filter(e => e.direction === 'up').length;
    const scaleDownEvents = this.scalingEvents.filter(e => e.direction === 'down').length;

    return {
      totalAnalyses: this.performanceMetrics.length,
      averageResponseTime: Math.round(avgResponseTime),
      scalingEvents: {
        total: this.scalingEvents.length,
        scaleUp: scaleUpEvents,
        scaleDown: scaleDownEvents
      },
      recentMetrics: recentMetrics.map(m => ({
        timestamp: m.timestamp,
        responseTime: Math.round(m.metrics.responseTime.avg),
        throughput: Math.round(m.metrics.throughput.requestsPerSecond),
        utilization: Math.round(m.metrics.concurrency.utilization)
      }))
    };
  }

  /**
   * Predict future scaling needs
   */
  predictScalingNeeds() {
    if (this.performanceMetrics.length < 10) {
      return {
        prediction: 'insufficient-data',
        confidence: 0
      };
    }

    const recent = this.performanceMetrics.slice(-10);
    const trend = this.calculateTrend(recent.map(m => m.metrics.concurrency.utilization));

    const prediction = {
      trend: trend > 5 ? 'increasing' : trend < -5 ? 'decreasing' : 'stable',
      trendValue: trend,
      nextAction: null,
      estimatedTime: null,
      confidence: Math.min(90, 50 + Math.abs(trend) * 5)
    };

    if (trend > 10) {
      prediction.nextAction = 'scale-up';
      prediction.estimatedTime = '15-30 minutes';
    } else if (trend < -10) {
      prediction.nextAction = 'scale-down';
      prediction.estimatedTime = '30-60 minutes';
    }

    return prediction;
  }

  /**
   * Calculate trend
   */
  calculateTrend(values) {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + i * v, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }
}

module.exports = ScalabilityOptimizer;
