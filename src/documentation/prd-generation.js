/**
 * PRD (Product Requirements Document) Generation Automation
 * Automatically generates comprehensive PRDs from context, research, and requirements
 */

const EventEmitter = require('events');

class PRDGeneration extends EventEmitter {
  constructor(contextBus, logger, contextConsolidation, researchAutomation, config = {}) {
    super();
    this.contextBus = contextBus;
    this.logger = logger;
    this.contextConsolidation = contextConsolidation;
    this.researchAutomation = researchAutomation;
    this.config = {
      autoGenerate: config.autoGenerate !== false,
      includeResearch: config.includeResearch !== false,
      includeMarketAnalysis: config.includeMarketAnalysis !== false,
      ...config
    };

    this.prdTemplates = this.initializeTemplates();
    this.generatedPRDs = new Map();
  }

  /**
   * Initialize PRD templates
   */
  initializeTemplates() {
    return {
      standard: {
        name: 'Standard PRD',
        sections: [
          'executive_summary',
          'problem_statement',
          'objectives',
          'user_personas',
          'requirements',
          'technical_specifications',
          'success_metrics',
          'timeline',
          'risks'
        ]
      },
      technical: {
        name: 'Technical PRD',
        sections: [
          'executive_summary',
          'technical_overview',
          'architecture',
          'requirements',
          'technical_specifications',
          'api_specifications',
          'database_schema',
          'security_requirements',
          'performance_requirements',
          'testing_strategy',
          'deployment_plan'
        ]
      },
      business: {
        name: 'Business PRD',
        sections: [
          'executive_summary',
          'market_analysis',
          'problem_statement',
          'solution_overview',
          'value_proposition',
          'user_personas',
          'business_model',
          'go_to_market_strategy',
          'success_metrics',
          'financial_projections',
          'risks'
        ]
      },
      mvp: {
        name: 'MVP PRD',
        sections: [
          'executive_summary',
          'problem_statement',
          'mvp_scope',
          'core_features',
          'requirements',
          'success_metrics',
          'timeline',
          'resources'
        ]
      }
    };
  }

  /**
   * Generate PRD for a project
   */
  async generatePRD(projectId, options = {}) {
    this.logger.info(`[PRD] Generating PRD for project: ${projectId}`);

    const prd = {
      id: `prd-${projectId}-${Date.now()}`,
      projectId,
      generatedAt: new Date().toISOString(),
      template: options.template || 'standard',
      version: '1.0',
      status: 'generating',
      content: {}
    };

    try {
      // Get project context
      const context = this.contextConsolidation.getContext(projectId);
      if (!context) {
        throw new Error(`Context not found for project: ${projectId}`);
      }

      // Conduct additional research if needed
      if (this.config.includeResearch && options.researchTopics) {
        await this.conductSupplementaryResearch(projectId, options.researchTopics);
        // Refresh context after research
        context = this.contextConsolidation.getContext(projectId);
      }

      // Get template
      const template = this.prdTemplates[prd.template];
      if (!template) {
        throw new Error(`Unknown template: ${prd.template}`);
      }

      // Generate each section
      for (const section of template.sections) {
        this.logger.info(`[PRD] Generating section: ${section}`);
        prd.content[section] = await this.generateSection(section, context, options);
      }

      // Generate metadata
      prd.metadata = {
        wordCount: this.calculateWordCount(prd.content),
        pageCount: Math.ceil(this.calculateWordCount(prd.content) / 500),
        completeness: this.assessCompleteness(prd.content, template.sections),
        lastUpdated: new Date().toISOString()
      };

      prd.status = 'completed';

      // Store PRD
      this.generatedPRDs.set(prd.id, prd);

      // Update context
      await this.contextConsolidation.addArtifact(projectId, {
        type: 'prd',
        prdId: prd.id,
        template: prd.template,
        version: prd.version
      });

      // Publish completion event
      await this.contextBus.publish('prd.generated', {
        projectId,
        prdId: prd.id,
        template: prd.template,
        wordCount: prd.metadata.wordCount,
        timestamp: prd.generatedAt
      });

      this.logger.info(`[PRD] Generated PRD for ${projectId}: ${prd.id}`);

      return prd;

    } catch (error) {
      prd.status = 'failed';
      prd.error = error.message;
      this.logger.error(`[PRD] Failed to generate PRD for ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Generate individual PRD section
   */
  async generateSection(section, context, options) {
    const generators = {
      executive_summary: () => this.generateExecutiveSummary(context, options),
      problem_statement: () => this.generateProblemStatement(context, options),
      objectives: () => this.generateObjectives(context, options),
      user_personas: () => this.generateUserPersonas(context, options),
      requirements: () => this.generateRequirements(context, options),
      technical_specifications: () => this.generateTechnicalSpecifications(context, options),
      success_metrics: () => this.generateSuccessMetrics(context, options),
      timeline: () => this.generateTimeline(context, options),
      risks: () => this.generateRisks(context, options),
      market_analysis: () => this.generateMarketAnalysis(context, options),
      architecture: () => this.generateArchitecture(context, options),
      api_specifications: () => this.generateAPISpecifications(context, options),
      database_schema: () => this.generateDatabaseSchema(context, options),
      security_requirements: () => this.generateSecurityRequirements(context, options),
      performance_requirements: () => this.generatePerformanceRequirements(context, options),
      testing_strategy: () => this.generateTestingStrategy(context, options),
      deployment_plan: () => this.generateDeploymentPlan(context, options),
      value_proposition: () => this.generateValueProposition(context, options),
      business_model: () => this.generateBusinessModel(context, options),
      go_to_market_strategy: () => this.generateGoToMarketStrategy(context, options),
      financial_projections: () => this.generateFinancialProjections(context, options),
      mvp_scope: () => this.generateMVPScope(context, options),
      core_features: () => this.generateCoreFeatures(context, options),
      resources: () => this.generateResources(context, options),
      technical_overview: () => this.generateTechnicalOverview(context, options),
      solution_overview: () => this.generateSolutionOverview(context, options)
    };

    const generator = generators[section];
    if (!generator) {
      return `[${section}] - To be completed`;
    }

    return await generator();
  }

  /**
   * Section generators
   */
  async generateExecutiveSummary(context, options) {
    const project = context.data.project || {};
    const requirements = context.data.requirements || [];

    return {
      title: 'Executive Summary',
      content: `
## Overview
${project.name || 'Project'} is designed to ${project.description || 'address specific market needs'}.

## Key Objectives
${requirements.slice(0, 3).map(req => `- ${req}`).join('\n') || '- Define project objectives'}

## Expected Outcomes
- Deliver a high-quality solution that meets all requirements
- Achieve defined success metrics
- Provide value to target users

## Timeline
Estimated delivery: ${options.targetDate || 'TBD'}

## Budget
Estimated budget: ${options.budget || 'TBD'}
      `.trim()
    };
  }

  async generateProblemStatement(context, options) {
    return {
      title: 'Problem Statement',
      content: `
## Current Situation
The market currently lacks ${context.data.project?.name || 'an effective solution'} to address ${context.data.project?.problem || 'specific user needs'}.

## Pain Points
${(context.data.requirements || []).slice(0, 5).map((req, i) => `${i + 1}. ${req}`).join('\n') || '1. User pain point\n2. Market gap\n3. Inefficiency'}

## Impact
Without a solution, users face:
- Reduced productivity
- Higher costs
- Poor user experience
- Competitive disadvantage

## Opportunity
This presents an opportunity to create value by solving these problems effectively.
      `.trim()
    };
  }

  async generateObjectives(context, options) {
    return {
      title: 'Project Objectives',
      content: `
## Primary Objectives
1. **Solve Core Problem**: Address the primary user pain point
2. **Deliver Value**: Provide measurable value to users
3. **Achieve Market Fit**: Meet market demands effectively

## Secondary Objectives
1. Establish competitive advantage
2. Build scalable infrastructure
3. Create sustainable business model

## Success Criteria
- All functional requirements met
- Performance targets achieved
- User satisfaction > 90%
- ROI > target threshold
      `.trim()
    };
  }

  async generateUserPersonas(context, options) {
    return {
      title: 'User Personas',
      content: `
## Primary Persona: Power User
- **Demographics**: 25-45 years old, tech-savvy professionals
- **Goals**: Efficiency, productivity, reliability
- **Pain Points**: Current solutions are slow, complex, or unreliable
- **Needs**: Fast, intuitive, powerful features

## Secondary Persona: Casual User
- **Demographics**: 18-65 years old, varying technical skills
- **Goals**: Simplicity, ease of use, quick results
- **Pain Points**: Steep learning curves, overwhelming interfaces
- **Needs**: Simple, guided experience

## Use Cases
1. Daily workflow automation
2. Project management
3. Team collaboration
4. Reporting and analytics
      `.trim()
    };
  }

  async generateRequirements(context, options) {
    const requirements = context.data.requirements || [];

    return {
      title: 'Requirements',
      functional: requirements.slice(0, 10).map((req, i) => ({
        id: `FR-${i + 1}`,
        requirement: req,
        priority: i < 3 ? 'High' : i < 7 ? 'Medium' : 'Low',
        category: 'Functional'
      })),
      nonFunctional: [
        { id: 'NFR-1', requirement: 'System must respond within 2 seconds', priority: 'High', category: 'Performance' },
        { id: 'NFR-2', requirement: 'System must be available 99.9% of the time', priority: 'High', category: 'Reliability' },
        { id: 'NFR-3', requirement: 'System must handle 1000 concurrent users', priority: 'Medium', category: 'Scalability' },
        { id: 'NFR-4', requirement: 'All data must be encrypted at rest and in transit', priority: 'High', category: 'Security' }
      ]
    };
  }

  async generateTechnicalSpecifications(context, options) {
    return {
      title: 'Technical Specifications',
      content: `
## Technology Stack
- **Frontend**: React/Next.js with TypeScript
- **Backend**: Node.js with Express/Hono
- **Database**: PostgreSQL with Redis cache
- **Infrastructure**: Cloud-native (AWS/GCP/Azure)
- **CI/CD**: GitHub Actions

## API Design
- RESTful API architecture
- JWT authentication
- Rate limiting
- API versioning

## Data Management
- PostgreSQL for relational data
- Redis for caching
- S3-compatible storage for files
- Event-driven architecture

## Security
- OAuth 2.0 / JWT authentication
- HTTPS everywhere
- Input validation
- SQL injection prevention
- XSS protection
      `.trim()
    };
  }

  async generateSuccessMetrics(context, options) {
    return {
      title: 'Success Metrics',
      content: `
## Key Performance Indicators (KPIs)

### User Metrics
- **User Adoption**: 1,000 users in first month
- **User Retention**: 80% monthly active users
- **User Satisfaction**: CSAT score > 4.5/5
- **Net Promoter Score**: NPS > 50

### Technical Metrics
- **Performance**: Page load time < 2 seconds
- **Availability**: 99.9% uptime
- **Response Time**: API response < 200ms (P95)
- **Error Rate**: < 0.1%

### Business Metrics
- **Revenue**: Meet revenue targets
- **Customer Acquisition Cost**: CAC < $X
- **Lifetime Value**: LTV > 3x CAC
- **Conversion Rate**: > 5%
      `.trim()
    };
  }

  async generateTimeline(context, options) {
    return {
      title: 'Project Timeline',
      phases: [
        { phase: 'Planning & Design', duration: '2 weeks', milestone: 'Design approved' },
        { phase: 'Development - Sprint 1-2', duration: '4 weeks', milestone: 'Core features complete' },
        { phase: 'Development - Sprint 3-4', duration: '4 weeks', milestone: 'All features complete' },
        { phase: 'Testing & QA', duration: '2 weeks', milestone: 'All tests passing' },
        { phase: 'Beta Launch', duration: '1 week', milestone: 'Beta users onboarded' },
        { phase: 'Production Launch', duration: '1 week', milestone: 'Public launch' }
      ],
      totalDuration: '14 weeks'
    };
  }

  async generateRisks(context, options) {
    return {
      title: 'Risks and Mitigation',
      risks: [
        {
          risk: 'Technical complexity higher than estimated',
          probability: 'Medium',
          impact: 'High',
          mitigation: 'Conduct technical spike, allocate buffer time'
        },
        {
          risk: 'Third-party API dependencies',
          probability: 'Low',
          impact: 'High',
          mitigation: 'Implement fallbacks, cache data, monitor API health'
        },
        {
          risk: 'Resource availability',
          probability: 'Medium',
          impact: 'Medium',
          mitigation: 'Cross-train team, maintain documentation'
        },
        {
          risk: 'Scope creep',
          probability: 'High',
          impact: 'Medium',
          mitigation: 'Strict change control, prioritize features'
        }
      ]
    };
  }

  async generateMarketAnalysis(context, options) {
    return {
      title: 'Market Analysis',
      content: `
## Market Size
- **Total Addressable Market (TAM)**: $XB
- **Serviceable Addressable Market (SAM)**: $XM
- **Serviceable Obtainable Market (SOM)**: $XM

## Competitive Landscape
- Competitor A: Market leader, high price point
- Competitor B: Mid-market player, feature-rich
- Competitor C: Budget option, limited features

## Market Trends
- Growing demand for automation
- Shift to cloud-based solutions
- Emphasis on user experience
- Integration capabilities critical

## Competitive Advantage
- Superior user experience
- Innovative features
- Competitive pricing
- Excellent customer support
      `.trim()
    };
  }

  async generateArchitecture(context, options) {
    return {
      title: 'System Architecture',
      content: `
## High-Level Architecture
\`\`\`
[Frontend] <-> [API Gateway] <-> [Backend Services] <-> [Database]
                    |                    |
                    v                    v
              [Cache Layer]        [Message Queue]
\`\`\`

## Components
1. **Frontend**: React SPA
2. **API Gateway**: Rate limiting, authentication
3. **Backend Services**: Microservices architecture
4. **Database**: Primary data store (PostgreSQL)
5. **Cache**: Redis for performance
6. **Message Queue**: Async processing (RabbitMQ/SQS)

## Scalability
- Horizontal scaling for backend services
- Database read replicas
- CDN for static assets
- Auto-scaling based on load
      `.trim()
    };
  }

  async generateAPISpecifications(context, options) {
    return {
      title: 'API Specifications',
      endpoints: [
        { method: 'POST', path: '/api/auth/login', description: 'User authentication' },
        { method: 'GET', path: '/api/projects', description: 'List projects' },
        { method: 'POST', path: '/api/projects', description: 'Create project' },
        { method: 'GET', path: '/api/projects/:id', description: 'Get project details' },
        { method: 'PUT', path: '/api/projects/:id', description: 'Update project' },
        { method: 'DELETE', path: '/api/projects/:id', description: 'Delete project' }
      ],
      authentication: 'JWT Bearer tokens',
      rateLimit: '100 requests per 15 minutes per IP',
      versioning: 'URL-based versioning (/api/v1/...)'
    };
  }

  async generateDatabaseSchema(context, options) {
    return {
      title: 'Database Schema',
      content: `
## Tables

### users
- id (UUID, PRIMARY KEY)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### projects
- id (UUID, PRIMARY KEY)
- name (VARCHAR)
- description (TEXT)
- user_id (UUID, FOREIGN KEY -> users.id)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### project_requirements
- id (UUID, PRIMARY KEY)
- project_id (UUID, FOREIGN KEY -> projects.id)
- requirement (TEXT)
- priority (VARCHAR)
- created_at (TIMESTAMP)

## Indexes
- users.email (UNIQUE)
- projects.user_id
- project_requirements.project_id
      `.trim()
    };
  }

  async generateSecurityRequirements(context, options) {
    return {
      title: 'Security Requirements',
      requirements: [
        'All data encrypted at rest (AES-256)',
        'All data encrypted in transit (TLS 1.3)',
        'Strong password policy (12+ chars, mixed case, numbers, symbols)',
        'Multi-factor authentication support',
        'Regular security audits',
        'OWASP Top 10 compliance',
        'Penetration testing before launch',
        'Regular dependency updates',
        'Security incident response plan',
        'GDPR and data privacy compliance'
      ]
    };
  }

  async generatePerformanceRequirements(context, options) {
    return {
      title: 'Performance Requirements',
      requirements: [
        { metric: 'Page Load Time', target: '< 2 seconds', measured: 'P95' },
        { metric: 'API Response Time', target: '< 200ms', measured: 'P95' },
        { metric: 'Time to First Byte', target: '< 500ms', measured: 'P50' },
        { metric: 'Concurrent Users', target: '1,000', measured: 'Peak' },
        { metric: 'Throughput', target: '10,000 req/min', measured: 'Sustained' },
        { metric: 'Database Query Time', target: '< 50ms', measured: 'P95' }
      ]
    };
  }

  async generateTestingStrategy(context, options) {
    return {
      title: 'Testing Strategy',
      content: `
## Testing Levels
1. **Unit Tests**: 80%+ code coverage
2. **Integration Tests**: All API endpoints
3. **End-to-End Tests**: Critical user flows
4. **Performance Tests**: Load and stress testing
5. **Security Tests**: Vulnerability scanning

## Tools
- Jest for unit/integration tests
- Cypress for E2E tests
- k6 for load testing
- OWASP ZAP for security scanning

## CI/CD Integration
- Automated tests on every PR
- Deployment blocked on test failures
- Nightly security scans
- Weekly performance tests
      `.trim()
    };
  }

  async generateDeploymentPlan(context, options) {
    return {
      title: 'Deployment Plan',
      content: `
## Environments
1. **Development**: Local and dev server
2. **Staging**: Pre-production testing
3. **Production**: Live environment

## Deployment Process
1. Code review and approval
2. Automated tests pass
3. Deploy to staging
4. Smoke tests in staging
5. Deploy to production
6. Monitor metrics
7. Rollback plan ready

## Monitoring
- Application performance monitoring (APM)
- Error tracking
- Log aggregation
- Uptime monitoring
- User analytics

## Rollback Strategy
- Blue-green deployment
- Feature flags for controlled rollout
- Database migration rollback scripts
- Automated rollback on critical errors
      `.trim()
    };
  }

  async generateValueProposition(context, options) {
    return {
      title: 'Value Proposition',
      content: `
## Core Value
${context.data.project?.name || 'Our solution'} provides unmatched value by combining efficiency, reliability, and ease of use.

## Key Benefits
1. **Time Savings**: 50% reduction in time spent on tasks
2. **Cost Reduction**: 30% lower total cost of ownership
3. **Better Outcomes**: 40% improvement in results
4. **User Satisfaction**: Intuitive, enjoyable experience

## Competitive Advantages
- Superior technology
- Better pricing
- Excellent support
- Proven track record
      `.trim()
    };
  }

  async generateBusinessModel(context, options) {
    return {
      title: 'Business Model',
      content: `
## Revenue Streams
1. **Subscription**: Monthly/annual recurring revenue
2. **Transaction Fees**: Commission on platform transactions
3. **Enterprise Licenses**: Custom pricing for large organizations
4. **Professional Services**: Implementation and consulting

## Pricing Strategy
- **Free Tier**: Basic features, limited usage
- **Pro Tier**: $29/month, advanced features
- **Business Tier**: $99/month, team features
- **Enterprise Tier**: Custom pricing, dedicated support

## Cost Structure
- Development: 40%
- Sales & Marketing: 30%
- Operations: 20%
- R&D: 10%
      `.trim()
    };
  }

  async generateGoToMarketStrategy(context, options) {
    return {
      title: 'Go-to-Market Strategy',
      content: `
## Target Segments
1. **Early Adopters**: Tech-savvy users seeking innovation
2. **SMBs**: Small to medium businesses
3. **Enterprises**: Large organizations (Year 2+)

## Marketing Channels
1. **Content Marketing**: Blog, SEO, thought leadership
2. **Social Media**: LinkedIn, Twitter, community building
3. **Paid Advertising**: Google Ads, targeted campaigns
4. **Partnerships**: Strategic alliances
5. **Referral Program**: Incentivized user acquisition

## Launch Plan
- **Month 1**: Beta launch, gather feedback
- **Month 2**: Public launch, PR campaign
- **Month 3-6**: Growth phase, optimize conversion
- **Month 7-12**: Scale phase, expand features
      `.trim()
    };
  }

  async generateFinancialProjections(context, options) {
    return {
      title: 'Financial Projections',
      projections: {
        year1: { revenue: '$100K', users: 1000, arr: '$120K' },
        year2: { revenue: '$500K', users: 5000, arr: '$600K' },
        year3: { revenue: '$2M', users: 20000, arr: '$2.4M' }
      },
      assumptions: [
        'Average revenue per user: $10/month',
        'Monthly churn rate: 5%',
        'Customer acquisition cost: $50',
        'Gross margin: 80%'
      ]
    };
  }

  async generateMVPScope(context, options) {
    return {
      title: 'MVP Scope',
      content: `
## In Scope (Must Have)
${(context.data.requirements || []).slice(0, 5).map((req, i) => `${i + 1}. ${req}`).join('\n')}

## Out of Scope (Future)
- Advanced analytics
- Third-party integrations
- Mobile apps
- Enterprise features

## Success Criteria
- Core user flow works end-to-end
- Basic features functional
- Performance acceptable
- No critical bugs
      `.trim()
    };
  }

  async generateCoreFeatures(context, options) {
    const requirements = context.data.requirements || [];
    return {
      title: 'Core Features',
      features: requirements.slice(0, 8).map((req, i) => ({
        id: `F-${i + 1}`,
        name: req,
        priority: i < 3 ? 'P0' : i < 6 ? 'P1' : 'P2',
        effort: i < 3 ? 'High' : 'Medium',
        dependencies: []
      }))
    };
  }

  async generateResources(context, options) {
    return {
      title: 'Resource Requirements',
      team: [
        { role: 'Product Manager', count: 1, allocation: '100%' },
        { role: 'Tech Lead', count: 1, allocation: '100%' },
        { role: 'Backend Developer', count: 2, allocation: '100%' },
        { role: 'Frontend Developer', count: 2, allocation: '100%' },
        { role: 'QA Engineer', count: 1, allocation: '100%' },
        { role: 'DevOps Engineer', count: 1, allocation: '50%' },
        { role: 'Designer', count: 1, allocation: '50%' }
      ],
      infrastructure: [
        'Cloud hosting ($200/month)',
        'CI/CD pipeline ($100/month)',
        'Monitoring tools ($50/month)',
        'Development tools ($100/month)'
      ]
    };
  }

  async generateTechnicalOverview(context, options) {
    return {
      title: 'Technical Overview',
      content: `
## System Overview
A modern, scalable web application built with industry-standard technologies.

## Key Technologies
- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Cache**: Redis
- **Hosting**: Cloud platform (AWS/GCP/Azure)

## Architecture Highlights
- Microservices architecture
- RESTful APIs
- Event-driven design
- Horizontal scalability
- High availability
      `.trim()
    };
  }

  async generateSolutionOverview(context, options) {
    return {
      title: 'Solution Overview',
      content: `
## What We're Building
${context.data.project?.description || 'A comprehensive solution to address user needs'}

## How It Works
1. User onboards seamlessly
2. Configures their preferences
3. Uses core features to solve problems
4. Achieves measurable results

## Key Differentiators
- Superior user experience
- Innovative approach
- Proven technology
- Reliable performance
      `.trim()
    };
  }

  /**
   * Helper methods
   */
  async conductSupplementaryResearch(projectId, topics) {
    for (const topic of topics) {
      try {
        const research = await this.researchAutomation.research(topic);
        await this.contextConsolidation.mergeResearch(projectId, topic, research);
      } catch (error) {
        this.logger.error(`[PRD] Supplementary research failed for ${topic}:`, error);
      }
    }
  }

  calculateWordCount(content) {
    const text = JSON.stringify(content);
    return text.split(/\s+/).length;
  }

  assessCompleteness(content, sections) {
    const completedSections = Object.keys(content).length;
    return (completedSections / sections.length) * 100;
  }

  /**
   * Export PRD in different formats
   */
  async exportPRD(prdId, format = 'markdown') {
    const prd = this.generatedPRDs.get(prdId);
    if (!prd) {
      throw new Error(`PRD not found: ${prdId}`);
    }

    switch (format) {
      case 'markdown':
        return this.prdToMarkdown(prd);
      case 'json':
        return JSON.stringify(prd, null, 2);
      case 'html':
        return this.prdToHTML(prd);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  prdToMarkdown(prd) {
    let md = `# Product Requirements Document\n\n`;
    md += `**Project**: ${prd.projectId}\n`;
    md += `**Generated**: ${prd.generatedAt}\n`;
    md += `**Template**: ${prd.template}\n`;
    md += `**Version**: ${prd.version}\n\n`;
    md += `---\n\n`;

    for (const [section, data] of Object.entries(prd.content)) {
      md += `# ${section.replace(/_/g, ' ').toUpperCase()}\n\n`;
      md += `${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}\n\n`;
    }

    return md;
  }

  prdToHTML(prd) {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>PRD - ${prd.projectId}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 30px; }
    .metadata { background: #f5f5f5; padding: 10px; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>Product Requirements Document</h1>
  <div class="metadata">
    <p><strong>Project:</strong> ${prd.projectId}</p>
    <p><strong>Generated:</strong> ${prd.generatedAt}</p>
    <p><strong>Template:</strong> ${prd.template}</p>
    <p><strong>Version:</strong> ${prd.version}</p>
  </div>
  ${Object.entries(prd.content).map(([section, data]) => `
    <h2>${section.replace(/_/g, ' ').toUpperCase()}</h2>
    <div>${typeof data === 'string' ? data.replace(/\n/g, '<br>') : JSON.stringify(data, null, 2)}</div>
  `).join('')}
</body>
</html>
    `.trim();
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      totalPRDs: this.generatedPRDs.size,
      templates: Object.keys(this.prdTemplates),
      recentPRDs: Array.from(this.generatedPRDs.values()).slice(-10).map(p => ({
        id: p.id,
        projectId: p.projectId,
        template: p.template,
        generatedAt: p.generatedAt,
        wordCount: p.metadata?.wordCount || 0
      }))
    };
  }
}

module.exports = PRDGeneration;
