/**
 * Business Plan Generation System
 * Automatically generates comprehensive business plans with financial models
 * Supports multiple business types: Startup, SaaS, E-commerce, Enterprise
 */

const EventEmitter = require('events');

class BusinessPlanGeneration extends EventEmitter {
  constructor(
    contextBus,
    logger,
    contextConsolidation,
    researchAutomation,
    config = {}
  ) {
    super();
    this.contextBus = contextBus;
    this.logger = logger;
    this.contextConsolidation = contextConsolidation;
    this.researchAutomation = researchAutomation;
    this.config = {
      includeFinancials: config.includeFinancials !== false,
      projectionYears: config.projectionYears || 3,
      ...config
    };

    this.templates = this.initializeTemplates();
    this.generatedPlans = new Map();
  }

  /**
   * Initialize business plan templates
   */
  initializeTemplates() {
    return {
      startup: {
        name: 'Startup Business Plan',
        sections: [
          'executive_summary',
          'company_description',
          'market_analysis',
          'organization_management',
          'product_service_line',
          'marketing_sales_strategy',
          'funding_request',
          'financial_projections',
          'risk_analysis',
          'exit_strategy'
        ]
      },
      saas: {
        name: 'SaaS Business Plan',
        sections: [
          'executive_summary',
          'company_description',
          'market_analysis',
          'product_overview',
          'technology_stack',
          'go_to_market_strategy',
          'pricing_model',
          'customer_acquisition',
          'financial_projections',
          'metrics_kpis',
          'risk_mitigation'
        ]
      },
      ecommerce: {
        name: 'E-commerce Business Plan',
        sections: [
          'executive_summary',
          'company_description',
          'market_analysis',
          'product_catalog',
          'supply_chain',
          'marketing_strategy',
          'operations_plan',
          'financial_projections',
          'growth_strategy'
        ]
      },
      enterprise: {
        name: 'Enterprise Business Plan',
        sections: [
          'executive_summary',
          'company_description',
          'market_analysis',
          'competitive_advantage',
          'organizational_structure',
          'operations_plan',
          'sales_strategy',
          'financial_projections',
          'risk_management',
          'scalability_plan'
        ]
      }
    };
  }

  /**
   * Generate comprehensive business plan
   */
  async generatePlan(projectId, options = {}) {
    this.logger.info(
      `[BusinessPlan] Generating business plan for project: ${projectId}`
    );

    const plan = {
      id: `bizplan-${projectId}-${Date.now()}`,
      projectId,
      generatedAt: new Date().toISOString(),
      template: options.template || 'startup',
      version: '1.0',
      status: 'generating',
      content: {},
      financials: {}
    };

    try {
      // Get project context
      const context = this.contextConsolidation.getContext(projectId);
      if (!context) {
        throw new Error(`Context not found for project: ${projectId}`);
      }

      // Conduct market research if needed
      if (options.conductResearch) {
        await this.conductMarketResearch(projectId, context);
      }

      // Get template
      const template = this.templates[plan.template];
      if (!template) {
        throw new Error(`Unknown template: ${plan.template}`);
      }

      // Generate each section
      for (const section of template.sections) {
        this.logger.info(`[BusinessPlan] Generating section: ${section}`);
        plan.content[section] = await this.generateSection(
          section,
          context,
          options
        );
      }

      // Generate financial models
      if (this.config.includeFinancials) {
        plan.financials = await this.generateFinancialModels(context, options);
      }

      // Calculate metadata
      plan.metadata = {
        pageCount: this.estimatePageCount(plan),
        projectionYears: this.config.projectionYears,
        completeness: this.assessCompleteness(plan, template),
        generatedAt: new Date().toISOString()
      };

      plan.status = 'completed';

      // Store plan
      this.generatedPlans.set(plan.id, plan);

      // Update context
      await this.contextConsolidation.addArtifact(projectId, {
        type: 'business_plan',
        planId: plan.id,
        template: plan.template,
        version: plan.version
      });

      // Publish completion
      await this.contextBus.publish('business-plan.generated', {
        projectId,
        planId: plan.id,
        template: plan.template,
        timestamp: plan.generatedAt
      });

      this.logger.info(
        `[BusinessPlan] Generated plan for ${projectId}: ${plan.id}`
      );

      return plan;
    } catch (error) {
      plan.status = 'failed';
      plan.error = error.message;
      this.logger.error(
        `[BusinessPlan] Failed to generate plan for ${projectId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Generate individual section
   */
  async generateSection(section, context, options) {
    const generators = {
      executive_summary: () => this.generateExecutiveSummary(context, options),
      company_description: () => this.generateCompanyDescription(context, options),
      market_analysis: () => this.generateMarketAnalysis(context, options),
      organization_management: () => this.generateOrganizationManagement(context, options),
      product_service_line: () => this.generateProductServiceLine(context, options),
      marketing_sales_strategy: () => this.generateMarketingSalesStrategy(context, options),
      funding_request: () => this.generateFundingRequest(context, options),
      financial_projections: () => this.generateFinancialProjections(context, options),
      risk_analysis: () => this.generateRiskAnalysis(context, options),
      exit_strategy: () => this.generateExitStrategy(context, options),
      product_overview: () => this.generateProductOverview(context, options),
      technology_stack: () => this.generateTechnologyStack(context, options),
      go_to_market_strategy: () => this.generateGoToMarketStrategy(context, options),
      pricing_model: () => this.generatePricingModel(context, options),
      customer_acquisition: () => this.generateCustomerAcquisition(context, options),
      metrics_kpis: () => this.generateMetricsKPIs(context, options),
      risk_mitigation: () => this.generateRiskMitigation(context, options),
      product_catalog: () => this.generateProductCatalog(context, options),
      supply_chain: () => this.generateSupplyChain(context, options),
      operations_plan: () => this.generateOperationsPlan(context, options),
      growth_strategy: () => this.generateGrowthStrategy(context, options),
      competitive_advantage: () => this.generateCompetitiveAdvantage(context, options),
      organizational_structure: () => this.generateOrganizationalStructure(context, options),
      sales_strategy: () => this.generateSalesStrategy(context, options),
      risk_management: () => this.generateRiskManagement(context, options),
      scalability_plan: () => this.generateScalabilityPlan(context, options)
    };

    const generator = generators[section];
    if (!generator) {
      return { title: section, content: 'To be completed' };
    }

    return await generator();
  }

  /**
   * Section generators
   */
  async generateExecutiveSummary(context, options) {
    const project = context.data.project || {};
    return {
      title: 'Executive Summary',
      content: `
## Business Concept
${project.name || 'Company'} is positioned to ${project.description || 'deliver innovative solutions'} in the ${options.industry || 'technology'} sector.

## Market Opportunity
The target market represents a ${options.marketSize || '$X billion'} opportunity with ${options.growthRate || 'XX%'} annual growth rate.

## Competitive Advantage
Our unique value proposition includes:
- Superior technology and innovation
- Strong team with proven track record
- Strategic partnerships and market positioning
- Scalable business model

## Financial Highlights
- Year 1 Revenue: ${options.year1Revenue || '$XXX,XXX'}
- Year 3 Revenue: ${options.year3Revenue || '$X,XXX,XXX'}
- Break-even: ${options.breakEvenMonth || 'Month XX'}
- Funding Required: ${options.fundingAmount || '$XXX,XXX'}

## Management Team
Led by experienced professionals with ${options.teamExperience || 'XX+ years'} combined industry experience.
      `.trim()
    };
  }

  async generateCompanyDescription(context, options) {
    return {
      title: 'Company Description',
      content: `
## Company Overview
${context.data.project?.name || 'Company'} was founded to address ${context.data.project?.problem || 'market needs'}.

## Mission Statement
To ${options.mission || 'deliver exceptional value to our customers through innovation and excellence'}.

## Vision
Become the ${options.vision || 'leading provider in our industry'}.

## Legal Structure
- Entity Type: ${options.entityType || 'C-Corporation'}
- Incorporation State: ${options.incorporationState || 'Delaware'}
- Founded: ${options.foundedDate || new Date().getFullYear()}

## Location
- Headquarters: ${options.hqLocation || 'City, State'}
- Operations: ${options.operationsLocation || 'Multiple locations'}

## Core Values
- Innovation and Excellence
- Customer Focus
- Integrity and Transparency
- Continuous Improvement
      `.trim()
    };
  }

  async generateMarketAnalysis(context, options) {
    return {
      title: 'Market Analysis',
      content: `
## Market Size and Growth
- Total Addressable Market (TAM): ${options.tam || '$XX billion'}
- Serviceable Addressable Market (SAM): ${options.sam || '$X billion'}
- Serviceable Obtainable Market (SOM): ${options.som || '$XX million'}
- CAGR: ${options.cagr || 'XX%'}

## Target Market Segments
1. **Primary Segment**: ${options.primarySegment || 'Description'}
2. **Secondary Segment**: ${options.secondarySegment || 'Description'}

## Market Trends
- Growing demand for digital transformation
- Shift towards cloud-based solutions
- Increasing focus on automation
- Rising emphasis on data security

## Competitive Landscape
**Direct Competitors**:
1. Competitor A: Market leader, ${options.competitor1Share || 'XX%'} market share
2. Competitor B: Mid-market player, ${options.competitor2Share || 'XX%'} market share
3. Competitor C: Emerging player, ${options.competitor3Share || 'XX%'} market share

**Indirect Competitors**:
- Alternative solutions and substitutes
- In-house development options

## Market Entry Strategy
- Target early adopters first
- Leverage strategic partnerships
- Focus on underserved niches
- Build strong brand presence
      `.trim()
    };
  }

  async generateFinancialProjections(context, options) {
    return {
      title: 'Financial Projections',
      years: Array.from({ length: this.config.projectionYears }, (_, i) => ({
        year: i + 1,
        revenue: this.calculateRevenue(i + 1, options),
        costs: this.calculateCosts(i + 1, options),
        profit: this.calculateProfit(i + 1, options),
        cashFlow: this.calculateCashFlow(i + 1, options)
      }))
    };
  }

  /**
   * Generate comprehensive financial models
   */
  async generateFinancialModels(context, options) {
    return {
      revenueModel: await this.buildRevenueModel(context, options),
      costStructure: await this.buildCostStructure(context, options),
      profitLoss: await this.buildProfitLossStatement(context, options),
      cashFlow: await this.buildCashFlowStatement(context, options),
      balanceSheet: await this.buildBalanceSheet(context, options),
      breakEvenAnalysis: await this.buildBreakEvenAnalysis(context, options),
      assumptions: this.defineFinancialAssumptions(options)
    };
  }

  async buildRevenueModel(context, options) {
    const years = [];
    for (let year = 1; year <= this.config.projectionYears; year++) {
      years.push({
        year,
        customers: this.projectCustomers(year, options),
        avgRevenuePerCustomer: this.calculateARPC(year, options),
        totalRevenue: this.calculateRevenue(year, options),
        growthRate: this.calculateGrowthRate(year, options)
      });
    }
    return { years, model: options.revenueModel || 'subscription' };
  }

  async buildCostStructure(context, options) {
    return {
      fixed: {
        salaries: options.fixedSalaries || 300000,
        rent: options.rent || 36000,
        insurance: options.insurance || 12000,
        software: options.software || 24000
      },
      variable: {
        cogs: options.cogsPercentage || 20,
        marketing: options.marketingPercentage || 25,
        sales: options.salesPercentage || 15,
        support: options.supportPercentage || 10
      }
    };
  }

  async buildProfitLossStatement(context, options) {
    const years = [];
    for (let year = 1; year <= this.config.projectionYears; year++) {
      const revenue = this.calculateRevenue(year, options);
      const costs = this.calculateCosts(year, options);
      years.push({
        year,
        revenue,
        costOfGoodsSold: revenue * 0.2,
        grossProfit: revenue * 0.8,
        operatingExpenses: costs,
        netIncome: revenue - costs,
        margin: `${(((revenue - costs) / revenue) * 100).toFixed(2)}%`
      });
    }
    return years;
  }

  async buildCashFlowStatement(context, options) {
    const years = [];
    let cumulativeCash = options.initialCash || 0;

    for (let year = 1; year <= this.config.projectionYears; year++) {
      const revenue = this.calculateRevenue(year, options);
      const costs = this.calculateCosts(year, options);
      const netCashFlow = revenue - costs;
      cumulativeCash += netCashFlow;

      years.push({
        year,
        cashFromOperations: netCashFlow,
        cashFromInvesting: options.investingCashFlow || 0,
        cashFromFinancing: year === 1 ? options.fundingAmount || 0 : 0,
        netCashFlow,
        cumulativeCash
      });
    }
    return years;
  }

  async buildBalanceSheet(context, options) {
    const years = [];
    for (let year = 1; year <= this.config.projectionYears; year++) {
      years.push({
        year,
        assets: {
          cash: this.calculateCash(year, options),
          accountsReceivable: this.calculateAR(year, options),
          inventory: this.calculateInventory(year, options),
          equipment: this.calculateEquipment(year, options)
        },
        liabilities: {
          accountsPayable: this.calculateAP(year, options),
          loans: this.calculateLoans(year, options)
        },
        equity: {
          investment: options.fundingAmount || 0,
          retainedEarnings: this.calculateRetainedEarnings(year, options)
        }
      });
    }
    return years;
  }

  async buildBreakEvenAnalysis(context, options) {
    const fixedCosts = 400000; // Annual fixed costs
    const avgRevenue = options.avgRevenuePerCustomer || 1000;
    const variableCosts = avgRevenue * 0.3;
    const contributionMargin = avgRevenue - variableCosts;

    return {
      fixedCosts,
      variableCostsPerUnit: variableCosts,
      revenuePerUnit: avgRevenue,
      contributionMargin,
      breakEvenUnits: Math.ceil(fixedCosts / contributionMargin),
      breakEvenRevenue: Math.ceil(fixedCosts / contributionMargin) * avgRevenue,
      breakEvenMonth: Math.ceil(fixedCosts / contributionMargin / 50) // Assuming 50 customers/month
    };
  }

  defineFinancialAssumptions(options) {
    return {
      revenueGrowth:
        options.revenueGrowth || '100% year 1, 80% year 2, 60% year 3',
      customerAcquisitionCost: options.cac || 100,
      lifetimeValue: options.ltv || 3000,
      churnRate: options.churnRate || '5% monthly',
      grossMargin: options.grossMargin || '80%',
      operatingExpenses: options.opexPercentage || '60% of revenue'
    };
  }

  /**
   * Financial calculation helpers
   */
  calculateRevenue(year, options) {
    const baseRevenue = options.year1Revenue || 100000;
    const growthRates = [1, 1.8, 1.6]; // 100%, 80%, 60% growth
    return Math.round(
      baseRevenue * growthRates.slice(0, year).reduce((a, b) => a * b, 1)
    );
  }

  calculateCosts(year, options) {
    const revenue = this.calculateRevenue(year, options);
    return Math.round(revenue * 0.7); // 70% of revenue
  }

  calculateProfit(year, options) {
    return (
      this.calculateRevenue(year, options) - this.calculateCosts(year, options)
    );
  }

  calculateCashFlow(year, options) {
    return this.calculateProfit(year, options);
  }

  projectCustomers(year, options) {
    return Math.round((options.year1Customers || 100) * 1.5 ** (year - 1));
  }

  calculateARPC(year, options) {
    return options.avgRevenuePerCustomer || 1000;
  }

  calculateGrowthRate(year, options) {
    if (year === 1) return 100;
    const rates = [80, 60, 50];
    return rates[year - 2] || 40;
  }

  calculateCash(year, options) {
    return this.calculateRevenue(year, options) * 0.3;
  }

  calculateAR(year, options) {
    return this.calculateRevenue(year, options) * 0.1;
  }

  calculateInventory(year, options) {
    return options.inventoryNeeded
      ? this.calculateRevenue(year, options) * 0.05
      : 0;
  }

  calculateEquipment(year, options) {
    return options.equipmentValue || 50000;
  }

  calculateAP(year, options) {
    return this.calculateCosts(year, options) * 0.1;
  }

  calculateLoans(year, options) {
    return options.loanAmount || 0;
  }

  calculateRetainedEarnings(year, options) {
    let cumulative = 0;
    for (let y = 1; y <= year; y++) {
      cumulative += this.calculateProfit(y, options);
    }
    return cumulative;
  }

  /**
   * Additional section generators (streamlined)
   */
  async generateOrganizationManagement(context, options) {
    return {
      title: 'Organization & Management',
      content:
        'Organizational structure, management team, board of directors, and advisors'
    };
  }

  async generateProductServiceLine(context, options) {
    return {
      title: 'Product/Service Line',
      content: 'Detailed description of products and services offered'
    };
  }

  async generateMarketingSalesStrategy(context, options) {
    return {
      title: 'Marketing & Sales Strategy',
      content: 'Go-to-market strategy, customer acquisition, and sales process'
    };
  }

  async generateFundingRequest(context, options) {
    return {
      title: 'Funding Request',
      amount: options.fundingAmount || 500000,
      use: 'Product development (40%), Marketing (30%), Operations (20%), Working capital (10%)',
      timeline: '18-24 months runway'
    };
  }

  async generateRiskAnalysis(context, options) {
    return {
      title: 'Risk Analysis',
      risks: [
        {
          risk: 'Market Risk',
          mitigation: 'Diversify customer base and revenue streams'
        },
        {
          risk: 'Competition',
          mitigation: 'Continuous innovation and strong customer relationships'
        },
        {
          risk: 'Technology Risk',
          mitigation: 'Robust architecture and security measures'
        }
      ]
    };
  }

  async generateExitStrategy(context, options) {
    return {
      title: 'Exit Strategy',
      content:
        'Potential exit options: Acquisition, IPO, or continued private growth'
    };
  }

  async generateProductOverview(context, options) {
    return {
      title: 'Product Overview',
      content: 'Comprehensive product features and benefits'
    };
  }

  async generateTechnologyStack(context, options) {
    return {
      title: 'Technology Stack',
      content: 'Modern, scalable technology infrastructure'
    };
  }

  async generateGoToMarketStrategy(context, options) {
    return {
      title: 'Go-to-Market Strategy',
      content: 'Phased market entry and growth strategy'
    };
  }

  async generatePricingModel(context, options) {
    return {
      title: 'Pricing Model',
      tiers: [
        { name: 'Basic', price: '$29/month', features: 'Core features' },
        { name: 'Pro', price: '$99/month', features: 'Advanced features' },
        {
          name: 'Enterprise',
          price: 'Custom',
          features: 'Full suite + support'
        }
      ]
    };
  }

  async generateCustomerAcquisition(context, options) {
    return {
      title: 'Customer Acquisition',
      content: 'Multi-channel acquisition strategy'
    };
  }

  async generateMetricsKPIs(context, options) {
    return {
      title: 'Metrics & KPIs',
      kpis: ['MRR', 'ARR', 'CAC', 'LTV', 'Churn Rate', 'NPS']
    };
  }

  async generateRiskMitigation(context, options) {
    return {
      title: 'Risk Mitigation',
      content: 'Proactive risk management strategies'
    };
  }

  async generateProductCatalog(context, options) {
    return { title: 'Product Catalog', content: 'Complete product offerings' };
  }

  async generateSupplyChain(context, options) {
    return {
      title: 'Supply Chain',
      content: 'End-to-end supply chain management'
    };
  }

  async generateOperationsPlan(context, options) {
    return {
      title: 'Operations Plan',
      content: 'Day-to-day operations and processes'
    };
  }

  async generateGrowthStrategy(context, options) {
    return { title: 'Growth Strategy', content: 'Sustainable growth roadmap' };
  }

  async generateCompetitiveAdvantage(context, options) {
    return {
      title: 'Competitive Advantage',
      content: 'Unique differentiators and moats'
    };
  }

  async generateOrganizationalStructure(context, options) {
    return {
      title: 'Organizational Structure',
      content: 'Scalable org structure'
    };
  }

  async generateSalesStrategy(context, options) {
    return { title: 'Sales Strategy', content: 'B2B/B2C sales approach' };
  }

  async generateRiskManagement(context, options) {
    return {
      title: 'Risk Management',
      content: 'Enterprise risk management framework'
    };
  }

  async generateScalabilityPlan(context, options) {
    return {
      title: 'Scalability Plan',
      content: 'Infrastructure and operational scalability'
    };
  }

  /**
   * Helper methods
   */
  async conductMarketResearch(projectId, context) {
    const topics = ['market size', 'competition', 'industry trends'];
    for (const topic of topics) {
      try {
        await this.researchAutomation.research(
          `${context.data.project?.name} ${topic}`
        );
      } catch (error) {
        this.logger.error(
          `[BusinessPlan] Market research failed for ${topic}:`,
          error
        );
      }
    }
  }

  estimatePageCount(plan) {
    const contentSize = JSON.stringify(plan.content).length;
    return Math.ceil(contentSize / 3000); // ~3000 chars per page
  }

  assessCompleteness(plan, template) {
    const completed = Object.keys(plan.content).length;
    return (completed / template.sections.length) * 100;
  }

  /**
   * Export business plan
   */
  async exportPlan(planId, format = 'pdf') {
    const plan = this.generatedPlans.get(planId);
    if (!plan) {
      throw new Error(`Business plan not found: ${planId}`);
    }

    switch (format) {
    case 'pdf':
      return { message: 'PDF export would be generated here', plan };
    case 'docx':
      return { message: 'Word export would be generated here', plan };
    case 'json':
      return JSON.stringify(plan, null, 2);
    default:
      throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      totalPlans: this.generatedPlans.size,
      templates: Object.keys(this.templates),
      recentPlans: Array.from(this.generatedPlans.values()).slice(-10)
    };
  }
}

module.exports = BusinessPlanGeneration;
