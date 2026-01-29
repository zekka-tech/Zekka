/**
 * Advanced Analytics Dashboard
 * Comprehensive analytics and insights system for project metrics and performance
 *
 * Features:
 * - Real-time metrics collection
 * - Performance analytics
 * - User behavior tracking
 * - Resource utilization monitoring
 * - Custom reports and visualizations
 * - Predictive analytics
 * - Anomaly detection
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class AdvancedAnalyticsDashboard extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      metricsRetention: config.metricsRetention || 90, // days
      aggregationInterval: config.aggregationInterval || 60000, // 1 minute
      anomalyThreshold: config.anomalyThreshold || 2.5, // standard deviations
      enableRealTime: config.enableRealTime !== false,
      enablePrediction: config.enablePrediction !== false,
      ...config
    };

    // Metrics storage
    this.metrics = {
      system: [],
      performance: [],
      users: [],
      business: [],
      custom: []
    };

    // Aggregated data
    this.aggregates = {
      hourly: new Map(),
      daily: new Map(),
      weekly: new Map(),
      monthly: new Map()
    };

    // Dashboards
    this.dashboards = new Map();

    // Reports
    this.reports = [];

    // Alerts
    this.alerts = [];

    // Statistics
    this.stats = {
      totalMetrics: 0,
      totalDataPoints: 0,
      dashboards: 0,
      reports: 0,
      alerts: 0,
      lastUpdate: new Date()
    };

    // Initialize default dashboards
    this.initializeDefaultDashboards();

    // Start aggregation if enabled
    if (this.config.enableRealTime) {
      this.startAggregation();
    }

    console.log('Advanced Analytics Dashboard initialized');
  }

  /**
   * Initialize default dashboards
   */
  initializeDefaultDashboards() {
    // System Performance Dashboard
    this.createDashboard({
      id: 'system-performance',
      name: 'System Performance',
      description: 'System resources and performance metrics',
      widgets: [
        {
          type: 'line-chart',
          metric: 'cpu',
          title: 'CPU Usage',
          position: {
            x: 0,
            y: 0,
            w: 6,
            h: 4
          }
        },
        {
          type: 'line-chart',
          metric: 'memory',
          title: 'Memory Usage',
          position: {
            x: 6,
            y: 0,
            w: 6,
            h: 4
          }
        },
        {
          type: 'area-chart',
          metric: 'network',
          title: 'Network Traffic',
          position: {
            x: 0,
            y: 4,
            w: 12,
            h: 4
          }
        },
        {
          type: 'gauge',
          metric: 'disk',
          title: 'Disk Usage',
          position: {
            x: 0,
            y: 8,
            w: 4,
            h: 3
          }
        },
        {
          type: 'number',
          metric: 'uptime',
          title: 'Uptime',
          position: {
            x: 4,
            y: 8,
            w: 4,
            h: 3
          }
        },
        {
          type: 'status',
          metric: 'health',
          title: 'System Health',
          position: {
            x: 8,
            y: 8,
            w: 4,
            h: 3
          }
        }
      ]
    });

    // User Analytics Dashboard
    this.createDashboard({
      id: 'user-analytics',
      name: 'User Analytics',
      description: 'User engagement and behavior metrics',
      widgets: [
        {
          type: 'number',
          metric: 'active-users',
          title: 'Active Users',
          position: {
            x: 0,
            y: 0,
            w: 3,
            h: 2
          }
        },
        {
          type: 'number',
          metric: 'new-users',
          title: 'New Users',
          position: {
            x: 3,
            y: 0,
            w: 3,
            h: 2
          }
        },
        {
          type: 'number',
          metric: 'sessions',
          title: 'Sessions',
          position: {
            x: 6,
            y: 0,
            w: 3,
            h: 2
          }
        },
        {
          type: 'number',
          metric: 'page-views',
          title: 'Page Views',
          position: {
            x: 9,
            y: 0,
            w: 3,
            h: 2
          }
        },
        {
          type: 'line-chart',
          metric: 'user-growth',
          title: 'User Growth',
          position: {
            x: 0,
            y: 2,
            w: 12,
            h: 4
          }
        },
        {
          type: 'bar-chart',
          metric: 'top-pages',
          title: 'Top Pages',
          position: {
            x: 0,
            y: 6,
            w: 6,
            h: 4
          }
        },
        {
          type: 'pie-chart',
          metric: 'traffic-sources',
          title: 'Traffic Sources',
          position: {
            x: 6,
            y: 6,
            w: 6,
            h: 4
          }
        }
      ]
    });

    // Business Metrics Dashboard
    this.createDashboard({
      id: 'business-metrics',
      name: 'Business Metrics',
      description: 'Key business performance indicators',
      widgets: [
        {
          type: 'number',
          metric: 'revenue',
          title: 'Total Revenue',
          position: {
            x: 0,
            y: 0,
            w: 3,
            h: 2
          }
        },
        {
          type: 'number',
          metric: 'mrr',
          title: 'Monthly Recurring Revenue',
          position: {
            x: 3,
            y: 0,
            w: 3,
            h: 2
          }
        },
        {
          type: 'number',
          metric: 'customers',
          title: 'Total Customers',
          position: {
            x: 6,
            y: 0,
            w: 3,
            h: 2
          }
        },
        {
          type: 'number',
          metric: 'churn',
          title: 'Churn Rate',
          position: {
            x: 9,
            y: 0,
            w: 3,
            h: 2
          }
        },
        {
          type: 'line-chart',
          metric: 'revenue-trend',
          title: 'Revenue Trend',
          position: {
            x: 0,
            y: 2,
            w: 12,
            h: 4
          }
        },
        {
          type: 'bar-chart',
          metric: 'revenue-by-product',
          title: 'Revenue by Product',
          position: {
            x: 0,
            y: 6,
            w: 6,
            h: 4
          }
        },
        {
          type: 'funnel',
          metric: 'conversion-funnel',
          title: 'Conversion Funnel',
          position: {
            x: 6,
            y: 6,
            w: 6,
            h: 4
          }
        }
      ]
    });

    // Performance Analytics Dashboard
    this.createDashboard({
      id: 'performance-analytics',
      name: 'Performance Analytics',
      description: 'Application performance and response time metrics',
      widgets: [
        {
          type: 'number',
          metric: 'avg-response-time',
          title: 'Avg Response Time',
          position: {
            x: 0,
            y: 0,
            w: 3,
            h: 2
          }
        },
        {
          type: 'number',
          metric: 'error-rate',
          title: 'Error Rate',
          position: {
            x: 3,
            y: 0,
            w: 3,
            h: 2
          }
        },
        {
          type: 'number',
          metric: 'throughput',
          title: 'Throughput',
          position: {
            x: 6,
            y: 0,
            w: 3,
            h: 2
          }
        },
        {
          type: 'number',
          metric: 'apdex',
          title: 'Apdex Score',
          position: {
            x: 9,
            y: 0,
            w: 3,
            h: 2
          }
        },
        {
          type: 'line-chart',
          metric: 'response-time-trend',
          title: 'Response Time Trend',
          position: {
            x: 0,
            y: 2,
            w: 12,
            h: 4
          }
        },
        {
          type: 'heatmap',
          metric: 'endpoint-performance',
          title: 'Endpoint Performance',
          position: {
            x: 0,
            y: 6,
            w: 12,
            h: 4
          }
        }
      ]
    });

    this.stats.dashboards = this.dashboards.size;
  }

  /**
   * Create custom dashboard
   */
  createDashboard(config) {
    const dashboardId = config.id || crypto.randomUUID();

    const dashboard = {
      id: dashboardId,
      name: config.name,
      description: config.description || '',
      widgets: config.widgets || [],
      layout: config.layout || 'grid',
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: config.isDefault || false,
      metadata: config.metadata || {}
    };

    this.dashboards.set(dashboardId, dashboard);
    this.stats.dashboards = this.dashboards.size;

    this.emit('dashboard.created', { dashboardId, dashboard });

    console.log(`Dashboard created: ${dashboardId} - ${dashboard.name}`);

    return dashboard;
  }

  /**
   * Track metric
   */
  trackMetric(category, metric, value, metadata = {}) {
    const dataPoint = {
      id: crypto.randomUUID(),
      category,
      metric,
      value,
      metadata,
      timestamp: new Date()
    };

    // Store in appropriate category
    if (this.metrics[category]) {
      this.metrics[category].push(dataPoint);

      // Keep only recent data based on retention
      this.pruneOldMetrics(category);
    } else {
      console.warn(`Unknown metric category: ${category}`);
    }

    this.stats.totalDataPoints++;
    this.stats.lastUpdate = new Date();

    // Check for anomalies
    if (this.config.enableRealTime) {
      this.checkAnomalies(category, metric, value);
    }

    this.emit('metric.tracked', dataPoint);

    return dataPoint;
  }

  /**
   * Track system metrics
   */
  trackSystemMetric(metric, value, metadata = {}) {
    return this.trackMetric('system', metric, value, metadata);
  }

  /**
   * Track performance metrics
   */
  trackPerformanceMetric(metric, value, metadata = {}) {
    return this.trackMetric('performance', metric, value, metadata);
  }

  /**
   * Track user metrics
   */
  trackUserMetric(metric, value, metadata = {}) {
    return this.trackMetric('users', metric, value, metadata);
  }

  /**
   * Track business metrics
   */
  trackBusinessMetric(metric, value, metadata = {}) {
    return this.trackMetric('business', metric, value, metadata);
  }

  /**
   * Get metrics
   */
  getMetrics(category, filters = {}) {
    let metrics = this.metrics[category] || [];

    // Apply filters
    if (filters.metric) {
      metrics = metrics.filter((m) => m.metric === filters.metric);
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      metrics = metrics.filter((m) => m.timestamp >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      metrics = metrics.filter((m) => m.timestamp <= endDate);
    }

    return metrics;
  }

  /**
   * Aggregate metrics
   */
  aggregateMetrics(category, metric, interval = 'hourly') {
    const metrics = this.getMetrics(category, { metric });

    const aggregated = new Map();

    for (const dataPoint of metrics) {
      const key = this.getIntervalKey(dataPoint.timestamp, interval);

      if (!aggregated.has(key)) {
        aggregated.set(key, {
          interval: key,
          count: 0,
          sum: 0,
          min: Infinity,
          max: -Infinity,
          values: []
        });
      }

      const agg = aggregated.get(key);
      agg.count++;
      agg.sum += dataPoint.value;
      agg.min = Math.min(agg.min, dataPoint.value);
      agg.max = Math.max(agg.max, dataPoint.value);
      agg.values.push(dataPoint.value);
    }

    // Calculate averages and standard deviations
    const results = [];
    for (const [interval, data] of aggregated.entries()) {
      const avg = data.sum / data.count;
      const variance = data.values.reduce((sum, val) => sum + (val - avg) ** 2, 0)
        / data.count;
      const stdDev = Math.sqrt(variance);

      results.push({
        interval,
        count: data.count,
        sum: data.sum,
        avg,
        min: data.min,
        max: data.max,
        stdDev
      });
    }

    return results;
  }

  /**
   * Get interval key for aggregation
   */
  getIntervalKey(timestamp, interval) {
    const date = new Date(timestamp);

    switch (interval) {
    case 'hourly':
      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
    case 'daily':
      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    case 'weekly':
      const weekNum = Math.floor(date.getDate() / 7);
      return `${date.getFullYear()}-${date.getMonth() + 1}-W${weekNum}`;
    case 'monthly':
      return `${date.getFullYear()}-${date.getMonth() + 1}`;
    default:
      return date.toISOString();
    }
  }

  /**
   * Check for anomalies
   */
  checkAnomalies(category, metric, value) {
    const recentMetrics = this.getMetrics(category, {
      metric,
      startDate: new Date(Date.now() - 3600000) // Last hour
    });

    if (recentMetrics.length < 10) {
      return; // Not enough data
    }

    const values = recentMetrics.map((m) => m.value);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + (val - avg) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const zScore = (value - avg) / stdDev;

    if (Math.abs(zScore) > this.config.anomalyThreshold) {
      const alert = {
        id: crypto.randomUUID(),
        type: 'anomaly',
        severity: Math.abs(zScore) > 3 ? 'critical' : 'warning',
        category,
        metric,
        value,
        expected: avg,
        deviation: zScore,
        timestamp: new Date(),
        message: `Anomaly detected: ${metric} value ${value} is ${Math.abs(zScore).toFixed(2)} standard deviations from the mean`
      };

      this.alerts.push(alert);
      this.stats.alerts++;

      this.emit('anomaly.detected', alert);

      console.warn(
        `Anomaly detected: ${category}.${metric} = ${value} (z-score: ${zScore.toFixed(2)})`
      );
    }
  }

  /**
   * Generate report
   */
  async generateReport(config) {
    const reportId = crypto.randomUUID();

    const report = {
      id: reportId,
      name: config.name,
      type: config.type || 'summary',
      startDate: config.startDate,
      endDate: config.endDate,
      generatedAt: new Date(),
      sections: []
    };

    // System Performance Section
    if (!config.sections || config.sections.includes('system')) {
      const systemMetrics = this.getMetrics('system', {
        startDate: config.startDate,
        endDate: config.endDate
      });

      report.sections.push({
        title: 'System Performance',
        metrics: this.aggregateMetrics('system', 'cpu', 'daily'),
        summary: {
          avgCPU: this.calculateAverage(
            systemMetrics.filter((m) => m.metric === 'cpu')
          ),
          avgMemory: this.calculateAverage(
            systemMetrics.filter((m) => m.metric === 'memory')
          ),
          avgDisk: this.calculateAverage(
            systemMetrics.filter((m) => m.metric === 'disk')
          )
        }
      });
    }

    // User Analytics Section
    if (!config.sections || config.sections.includes('users')) {
      const userMetrics = this.getMetrics('users', {
        startDate: config.startDate,
        endDate: config.endDate
      });

      report.sections.push({
        title: 'User Analytics',
        metrics: this.aggregateMetrics('users', 'active-users', 'daily'),
        summary: {
          totalUsers: userMetrics.filter((m) => m.metric === 'active-users')
            .length,
          newUsers: userMetrics.filter((m) => m.metric === 'new-users').length,
          avgSessions: this.calculateAverage(
            userMetrics.filter((m) => m.metric === 'sessions')
          )
        }
      });
    }

    // Business Metrics Section
    if (!config.sections || config.sections.includes('business')) {
      const businessMetrics = this.getMetrics('business', {
        startDate: config.startDate,
        endDate: config.endDate
      });

      report.sections.push({
        title: 'Business Metrics',
        metrics: this.aggregateMetrics('business', 'revenue', 'daily'),
        summary: {
          totalRevenue: businessMetrics
            .filter((m) => m.metric === 'revenue')
            .reduce((sum, m) => sum + m.value, 0),
          avgMRR: this.calculateAverage(
            businessMetrics.filter((m) => m.metric === 'mrr')
          ),
          totalCustomers:
            businessMetrics.filter((m) => m.metric === 'customers')[0]?.value
            || 0
        }
      });
    }

    // Performance Section
    if (!config.sections || config.sections.includes('performance')) {
      const perfMetrics = this.getMetrics('performance', {
        startDate: config.startDate,
        endDate: config.endDate
      });

      report.sections.push({
        title: 'Performance Metrics',
        metrics: this.aggregateMetrics('performance', 'response-time', 'daily'),
        summary: {
          avgResponseTime: this.calculateAverage(
            perfMetrics.filter((m) => m.metric === 'response-time')
          ),
          errorRate: this.calculateAverage(
            perfMetrics.filter((m) => m.metric === 'error-rate')
          ),
          throughput: this.calculateAverage(
            perfMetrics.filter((m) => m.metric === 'throughput')
          )
        }
      });
    }

    this.reports.push(report);
    this.stats.reports++;

    this.emit('report.generated', { reportId, report });

    console.log(`Report generated: ${reportId} - ${report.name}`);

    return report;
  }

  /**
   * Calculate average
   */
  calculateAverage(metrics) {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  /**
   * Predictive analytics
   */
  predictTrend(category, metric, periods = 7) {
    if (!this.config.enablePrediction) {
      return null;
    }

    const historicalData = this.aggregateMetrics(category, metric, 'daily');

    if (historicalData.length < 7) {
      console.warn('Insufficient data for prediction');
      return null;
    }

    // Simple linear regression for trend prediction
    const values = historicalData.map((d, i) => ({ x: i, y: d.avg }));

    const n = values.length;
    const sumX = values.reduce((sum, v) => sum + v.x, 0);
    const sumY = values.reduce((sum, v) => sum + v.y, 0);
    const sumXY = values.reduce((sum, v) => sum + v.x * v.y, 0);
    const sumX2 = values.reduce((sum, v) => sum + v.x * v.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict future values
    const predictions = [];
    for (let i = 0; i < periods; i++) {
      const x = n + i;
      const y = slope * x + intercept;
      predictions.push({
        period: i + 1,
        predicted: y,
        confidence: Math.max(0, Math.min(100, 100 - i * 10)) // Confidence decreases with time
      });
    }

    return {
      metric: `${category}.${metric}`,
      trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
      predictions,
      historicalAvg: sumY / n
    };
  }

  /**
   * Get dashboard
   */
  getDashboard(dashboardId) {
    const dashboard = this.dashboards.get(dashboardId);

    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    // Populate widget data
    const widgets = dashboard.widgets.map((widget) => {
      const metrics = this.getMetrics(widget.category || 'system', {
        metric: widget.metric,
        startDate: new Date(Date.now() - 3600000) // Last hour
      });

      return {
        ...widget,
        data: metrics,
        lastUpdate:
          metrics.length > 0 ? metrics[metrics.length - 1].timestamp : null
      };
    });

    return {
      ...dashboard,
      widgets
    };
  }

  /**
   * Get all dashboards
   */
  getAllDashboards() {
    return Array.from(this.dashboards.values());
  }

  /**
   * Get alerts
   */
  getAlerts(filters = {}) {
    let alerts = [...this.alerts];

    if (filters.severity) {
      alerts = alerts.filter((a) => a.severity === filters.severity);
    }

    if (filters.category) {
      alerts = alerts.filter((a) => a.category === filters.category);
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      alerts = alerts.filter((a) => a.timestamp >= startDate);
    }

    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Prune old metrics
   */
  pruneOldMetrics(category) {
    const retentionMs = this.config.metricsRetention * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - retentionMs);

    if (this.metrics[category]) {
      const before = this.metrics[category].length;
      this.metrics[category] = this.metrics[category].filter(
        (m) => m.timestamp >= cutoffDate
      );
      const after = this.metrics[category].length;

      if (before !== after) {
        console.log(`Pruned ${before - after} old metrics from ${category}`);
      }
    }
  }

  /**
   * Start aggregation
   */
  startAggregation() {
    this.aggregationInterval = setInterval(() => {
      // Aggregate all categories
      for (const category of Object.keys(this.metrics)) {
        const metrics = [
          ...new Set(this.metrics[category].map((m) => m.metric))
        ];

        for (const metric of metrics) {
          // Hourly aggregation
          const hourly = this.aggregateMetrics(category, metric, 'hourly');
          this.aggregates.hourly.set(`${category}.${metric}`, hourly);

          // Daily aggregation
          const daily = this.aggregateMetrics(category, metric, 'daily');
          this.aggregates.daily.set(`${category}.${metric}`, daily);
        }
      }

      this.emit('metrics.aggregated', {
        timestamp: new Date(),
        categories: Object.keys(this.metrics).length
      });
    }, this.config.aggregationInterval);

    console.log('Metrics aggregation started');
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      metrics: {
        system: this.metrics.system.length,
        performance: this.metrics.performance.length,
        users: this.metrics.users.length,
        business: this.metrics.business.length,
        custom: this.metrics.custom.length
      },
      aggregates: {
        hourly: this.aggregates.hourly.size,
        daily: this.aggregates.daily.size,
        weekly: this.aggregates.weekly.size,
        monthly: this.aggregates.monthly.size
      }
    };
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }

    console.log('Advanced Analytics Dashboard cleaned up');
  }
}

module.exports = AdvancedAnalyticsDashboard;
