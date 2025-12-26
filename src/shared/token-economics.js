const { Pool } = require('pg');

/**
 * Token Economics - Budget tracking and cost optimization
 * Automatically switches to Ollama when budget thresholds are reached
 */
class TokenEconomics {
  constructor(options = {}) {
    this.dailyBudget = options.dailyBudget || 50;
    this.monthlyBudget = options.monthlyBudget || 1000;
    this.contextBus = options.contextBus;
    
    // Cost per 1K tokens (USD)
    this.costs = {
      'claude-opus': { input: 0.015, output: 0.075 },
      'claude-sonnet-4': { input: 0.003, output: 0.015 },
      'claude-haiku': { input: 0.00025, output: 0.00125 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'llama3.1:8b': { input: 0.0001, output: 0.0001 }, // Ollama (local, minimal cost)
      'mistral': { input: 0.0001, output: 0.0001 },
      'codellama': { input: 0.0001, output: 0.0001 }
    };

    // Initialize DB connection
    this.db = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT) || 5432,
      database: process.env.POSTGRES_DB || 'zekka',
      user: process.env.POSTGRES_USER || 'zekka',
      password: process.env.POSTGRES_PASSWORD
    });
  }

  // ========================================
  // Cost Calculation
  // ========================================

  calculateCost(model, tokensInput, tokensOutput) {
    const modelCost = this.costs[model] || this.costs['gpt-3.5-turbo'];
    
    const inputCost = (tokensInput / 1000) * modelCost.input;
    const outputCost = (tokensOutput / 1000) * modelCost.output;
    
    return inputCost + outputCost;
  }

  // ========================================
  // Budget Tracking
  // ========================================

  async recordCost(data) {
    const { projectId, taskId, agentName, model, tokensInput, tokensOutput } = data;
    
    const cost = this.calculateCost(model, tokensInput, tokensOutput);
    
    await this.db.query(
      `INSERT INTO cost_tracking (project_id, task_id, agent_name, model_used, tokens_input, tokens_output, cost_usd)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [projectId, taskId, agentName, model, tokensInput, tokensOutput, cost]
    );

    // Update context bus metrics
    if (this.contextBus) {
      await this.contextBus.incrementCounter(`cost:total`, cost);
      await this.contextBus.incrementCounter(`cost:${projectId}`, cost);
    }

    return cost;
  }

  async getDailyCost(projectId = null) {
    const today = new Date().toISOString().split('T')[0];
    
    const query = projectId
      ? `SELECT COALESCE(SUM(cost_usd), 0) as total FROM cost_tracking 
         WHERE project_id = $1 AND DATE(timestamp) = $2`
      : `SELECT COALESCE(SUM(cost_usd), 0) as total FROM cost_tracking 
         WHERE DATE(timestamp) = $1`;
    
    const params = projectId ? [projectId, today] : [today];
    const result = await this.db.query(query, params);
    
    return parseFloat(result.rows[0].total);
  }

  async getMonthlyCost(projectId = null) {
    const firstDay = new Date();
    firstDay.setDate(1);
    const firstDayStr = firstDay.toISOString().split('T')[0];
    
    const query = projectId
      ? `SELECT COALESCE(SUM(cost_usd), 0) as total FROM cost_tracking 
         WHERE project_id = $1 AND DATE(timestamp) >= $2`
      : `SELECT COALESCE(SUM(cost_usd), 0) as total FROM cost_tracking 
         WHERE DATE(timestamp) >= $1`;
    
    const params = projectId ? [projectId, firstDayStr] : [firstDayStr];
    const result = await this.db.query(query, params);
    
    return parseFloat(result.rows[0].total);
  }

  async getBudgetStatus(projectId = null) {
    const dailyCost = await this.getDailyCost(projectId);
    const monthlyCost = await this.getMonthlyCost(projectId);
    
    return {
      daily: {
        spent: dailyCost,
        budget: this.dailyBudget,
        remaining: this.dailyBudget - dailyCost,
        percent: (dailyCost / this.dailyBudget) * 100
      },
      monthly: {
        spent: monthlyCost,
        budget: this.monthlyBudget,
        remaining: this.monthlyBudget - monthlyCost,
        percent: (monthlyCost / this.monthlyBudget) * 100
      }
    };
  }

  // ========================================
  // Model Selection (Cost Optimization)
  // ========================================

  async selectModel(taskComplexity, projectId = null) {
    const budgetStatus = await this.getBudgetStatus(projectId);
    
    // If over 95% of daily budget, use only Ollama
    if (budgetStatus.daily.percent > 95) {
      console.log('⚠️  Daily budget at 95%+ - forcing Ollama');
      return this.selectOllamaModel(taskComplexity);
    }
    
    // If over 80% of daily budget, switch to cheaper models
    if (budgetStatus.daily.percent > 80) {
      console.log('⚠️  Daily budget at 80%+ - using economic models');
      return taskComplexity === 'high' ? 'claude-haiku' : this.selectOllamaModel(taskComplexity);
    }
    
    // If over 90% of monthly budget, be conservative
    if (budgetStatus.monthly.percent > 90) {
      console.log('⚠️  Monthly budget at 90%+ - using economic models');
      return taskComplexity === 'high' ? 'claude-haiku' : this.selectOllamaModel(taskComplexity);
    }
    
    // Normal budget - select based on task complexity
    switch (taskComplexity) {
      case 'high':
        return 'claude-sonnet-4'; // Complex reasoning
      case 'medium':
        return 'claude-haiku'; // Moderate tasks
      case 'low':
        return this.selectOllamaModel('low'); // Simple tasks
      default:
        return 'claude-haiku';
    }
  }

  selectOllamaModel(taskComplexity) {
    // Select appropriate Ollama model based on task
    switch (taskComplexity) {
      case 'high':
      case 'medium':
        return 'llama3.1:8b'; // Best local model
      case 'code':
        return 'codellama'; // Code-specific
      default:
        return 'mistral'; // Fast general purpose
    }
  }

  // ========================================
  // Cost Reporting
  // ========================================

  async getCostSummary(projectId = null, period = 'daily') {
    const budgetStatus = await this.getBudgetStatus(projectId);
    
    // Get cost breakdown by model
    const modelQuery = projectId
      ? `SELECT model_used, SUM(cost_usd) as cost, COUNT(*) as calls 
         FROM cost_tracking 
         WHERE project_id = $1 AND DATE(timestamp) = CURRENT_DATE
         GROUP BY model_used`
      : `SELECT model_used, SUM(cost_usd) as cost, COUNT(*) as calls 
         FROM cost_tracking 
         WHERE DATE(timestamp) = CURRENT_DATE
         GROUP BY model_used`;
    
    const params = projectId ? [projectId] : [];
    const modelBreakdown = await this.db.query(modelQuery, params);
    
    // Get cost by agent
    const agentQuery = projectId
      ? `SELECT agent_name, SUM(cost_usd) as cost, COUNT(*) as calls 
         FROM cost_tracking 
         WHERE project_id = $1 AND DATE(timestamp) = CURRENT_DATE
         GROUP BY agent_name`
      : `SELECT agent_name, SUM(cost_usd) as cost, COUNT(*) as calls 
         FROM cost_tracking 
         WHERE DATE(timestamp) = CURRENT_DATE
         GROUP BY agent_name`;
    
    const agentBreakdown = await this.db.query(agentQuery, params);
    
    return {
      budget: budgetStatus,
      breakdown: {
        byModel: modelBreakdown.rows,
        byAgent: agentBreakdown.rows
      },
      recommendations: this.generateCostRecommendations(budgetStatus)
    };
  }

  generateCostRecommendations(budgetStatus) {
    const recommendations = [];
    
    if (budgetStatus.daily.percent > 90) {
      recommendations.push({
        severity: 'critical',
        message: 'Daily budget nearly exhausted. Consider using Ollama for remaining tasks.',
        action: 'switch_to_ollama'
      });
    } else if (budgetStatus.daily.percent > 80) {
      recommendations.push({
        severity: 'warning',
        message: 'Daily budget at 80%. Switching to economic models.',
        action: 'use_cheaper_models'
      });
    }
    
    if (budgetStatus.monthly.percent > 90) {
      recommendations.push({
        severity: 'critical',
        message: 'Monthly budget nearly exhausted. Review spending patterns.',
        action: 'review_budget'
      });
    }
    
    // Calculate savings if using Ollama
    const potentialSavings = budgetStatus.daily.spent * 0.8; // Assume 80% savings
    if (potentialSavings > 5) {
      recommendations.push({
        severity: 'info',
        message: `Could save ~$${potentialSavings.toFixed(2)}/day by using Ollama for more tasks`,
        action: 'optimize_model_selection'
      });
    }
    
    return recommendations;
  }

  // ========================================
  // Forecasting
  // ========================================

  async forecastMonthlyCost() {
    const daysInMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    ).getDate();
    
    const currentDay = new Date().getDate();
    const dailyAverage = (await this.getMonthlyCost()) / currentDay;
    const forecast = dailyAverage * daysInMonth;
    
    return {
      forecast,
      dailyAverage,
      daysRemaining: daysInMonth - currentDay,
      projectedOverrun: forecast > this.monthlyBudget ? forecast - this.monthlyBudget : 0
    };
  }

  async close() {
    await this.db.end();
  }
}

module.exports = TokenEconomics;
