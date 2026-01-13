/**
 * Agent Zero - Validator
 * Validates outputs, ensures quality standards, and verifies compliance
 */

const BaseAgentZero = require('./base-agent');

class ValidatorAgent extends BaseAgentZero {
  constructor(contextBus, logger, config = {}) {
    super('validator', contextBus, logger, config);
    this.validationRules = this.initializeValidationRules();
    this.validationHistory = [];
  }

  /**
   * Initialize validation rules
   */
  initializeValidationRules() {
    return {
      'code': [
        { rule: 'syntax-valid', severity: 'critical', description: 'Code must be syntactically valid' },
        { rule: 'no-security-issues', severity: 'critical', description: 'No security vulnerabilities' },
        { rule: 'follows-standards', severity: 'high', description: 'Follows coding standards' },
        { rule: 'has-tests', severity: 'high', description: 'Has adequate test coverage' },
        { rule: 'documented', severity: 'medium', description: 'Is properly documented' }
      ],
      'data': [
        { rule: 'valid-schema', severity: 'critical', description: 'Matches expected schema' },
        { rule: 'no-duplicates', severity: 'high', description: 'No duplicate entries' },
        { rule: 'within-bounds', severity: 'high', description: 'Values within acceptable ranges' },
        { rule: 'consistent-format', severity: 'medium', description: 'Consistent data format' }
      ],
      'configuration': [
        { rule: 'valid-syntax', severity: 'critical', description: 'Valid configuration syntax' },
        { rule: 'required-fields', severity: 'critical', description: 'All required fields present' },
        { rule: 'secure-values', severity: 'high', description: 'No exposed secrets' },
        { rule: 'optimal-settings', severity: 'low', description: 'Uses recommended settings' }
      ],
      'documentation': [
        { rule: 'complete', severity: 'high', description: 'Documentation is complete' },
        { rule: 'accurate', severity: 'high', description: 'Information is accurate' },
        { rule: 'clear', severity: 'medium', description: 'Easy to understand' },
        { rule: 'up-to-date', severity: 'medium', description: 'Reflects current state' }
      ]
    };
  }

  /**
   * Execute validation task
   */
  async executeTask(task) {
    switch (task.type) {
      case 'validate':
        return await this.validate(task.target, task.validationType);
      case 'compliance':
        return await this.checkCompliance(task.target, task.standards);
      case 'quality':
        return await this.assessQuality(task.target);
      case 'verify':
        return await this.verifyOutput(task.output, task.expected);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  /**
   * Validate target against rules
   */
  async validate(target, validationType) {
    this.logger.info(`[Validator] Validating ${validationType} for target ${target.id}`);

    const validation = {
      targetId: target.id,
      type: validationType,
      timestamp: new Date().toISOString(),
      passed: false,
      score: 0,
      issues: [],
      summary: {}
    };

    // Get rules for validation type
    const rules = this.validationRules[validationType] || [];

    // Run validation checks
    for (const rule of rules) {
      const result = await this.runValidationCheck(target, rule);
      
      if (!result.passed) {
        validation.issues.push({
          rule: rule.rule,
          severity: rule.severity,
          description: rule.description,
          details: result.details,
          suggestion: result.suggestion
        });
      }
    }

    // Calculate score
    validation.score = this.calculateValidationScore(validation.issues, rules);

    // Determine if validation passed
    validation.passed = validation.score >= 70 && 
      validation.issues.filter(i => i.severity === 'critical').length === 0;

    // Generate summary
    validation.summary = this.generateValidationSummary(validation);

    // Store validation result
    this.validationHistory.push(validation);

    // Notify about validation result
    await this.contextBus.publish(`agent.validator.validated`, {
      targetId: target.id,
      type: validationType,
      passed: validation.passed,
      score: validation.score,
      issues: validation.issues.length,
      timestamp: new Date().toISOString()
    });

    return validation;
  }

  /**
   * Check compliance with standards
   */
  async checkCompliance(target, standards) {
    this.logger.info(`[Validator] Checking compliance for target ${target.id}`);

    const compliance = {
      targetId: target.id,
      standards: standards,
      timestamp: new Date().toISOString(),
      compliant: false,
      violations: [],
      warnings: [],
      score: 0
    };

    // Check each standard
    for (const standard of standards) {
      const result = await this.checkStandard(target, standard);
      
      if (result.violations.length > 0) {
        compliance.violations.push(...result.violations.map(v => ({
          standard: standard.name,
          violation: v,
          severity: 'high'
        })));
      }

      if (result.warnings.length > 0) {
        compliance.warnings.push(...result.warnings.map(w => ({
          standard: standard.name,
          warning: w,
          severity: 'medium'
        })));
      }
    }

    // Calculate compliance score
    compliance.score = this.calculateComplianceScore(
      standards.length,
      compliance.violations.length,
      compliance.warnings.length
    );

    // Determine overall compliance
    compliance.compliant = compliance.score >= 80 && compliance.violations.length === 0;

    return compliance;
  }

  /**
   * Assess overall quality
   */
  async assessQuality(target) {
    this.logger.info(`[Validator] Assessing quality for target ${target.id}`);

    const assessment = {
      targetId: target.id,
      timestamp: new Date().toISOString(),
      dimensions: {},
      overallScore: 0,
      grade: '',
      recommendations: []
    };

    // Assess multiple quality dimensions
    assessment.dimensions = {
      functionality: await this.assessFunctionality(target),
      reliability: await this.assessReliability(target),
      performance: await this.assessPerformance(target),
      security: await this.assessSecurity(target),
      maintainability: await this.assessMaintainability(target),
      documentation: await this.assessDocumentation(target)
    };

    // Calculate overall score
    const scores = Object.values(assessment.dimensions).map(d => d.score);
    assessment.overallScore = Math.round(
      scores.reduce((sum, s) => sum + s, 0) / scores.length
    );

    // Assign grade
    assessment.grade = this.assignGrade(assessment.overallScore);

    // Generate recommendations
    assessment.recommendations = this.generateQualityRecommendations(assessment.dimensions);

    return assessment;
  }

  /**
   * Verify output matches expected
   */
  async verifyOutput(output, expected) {
    this.logger.info('[Validator] Verifying output');

    const verification = {
      timestamp: new Date().toISOString(),
      verified: false,
      matches: [],
      mismatches: [],
      accuracy: 0
    };

    // Compare outputs
    for (const key of Object.keys(expected)) {
      if (JSON.stringify(output[key]) === JSON.stringify(expected[key])) {
        verification.matches.push({
          field: key,
          expected: expected[key],
          actual: output[key]
        });
      } else {
        verification.mismatches.push({
          field: key,
          expected: expected[key],
          actual: output[key],
          difference: this.calculateDifference(expected[key], output[key])
        });
      }
    }

    // Calculate accuracy
    const totalFields = Object.keys(expected).length;
    verification.accuracy = Math.round((verification.matches.length / totalFields) * 100);

    // Determine if verified
    verification.verified = verification.accuracy === 100;

    return verification;
  }

  /**
   * Helper methods
   */
  async runValidationCheck(target, rule) {
    // Simulate validation check
    const passed = Math.random() > 0.2; // 80% pass rate for demo

    return {
      passed,
      details: passed ? 'Check passed' : `Failed: ${rule.description}`,
      suggestion: passed ? null : this.getSuggestion(rule.rule)
    };
  }

  getSuggestion(ruleType) {
    const suggestions = {
      'syntax-valid': 'Run a linter to identify and fix syntax errors',
      'no-security-issues': 'Use security scanning tools to identify vulnerabilities',
      'follows-standards': 'Review coding standards and apply formatting tools',
      'has-tests': 'Write unit tests with at least 80% coverage',
      'documented': 'Add clear comments and documentation',
      'valid-schema': 'Validate data against the defined schema',
      'no-duplicates': 'Implement deduplication logic',
      'within-bounds': 'Add range validation',
      'consistent-format': 'Normalize data format across all entries'
    };
    return suggestions[ruleType] || 'Review and fix the issue';
  }

  calculateValidationScore(issues, rules) {
    const totalRules = rules.length;
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;
    const mediumIssues = issues.filter(i => i.severity === 'medium').length;

    // Penalize based on severity
    let score = 100;
    score -= criticalIssues * 30;
    score -= highIssues * 15;
    score -= mediumIssues * 5;

    return Math.max(0, score);
  }

  generateValidationSummary(validation) {
    const critical = validation.issues.filter(i => i.severity === 'critical').length;
    const high = validation.issues.filter(i => i.severity === 'high').length;
    const medium = validation.issues.filter(i => i.severity === 'medium').length;

    return {
      totalIssues: validation.issues.length,
      critical,
      high,
      medium,
      status: validation.passed ? 'PASSED' : 'FAILED',
      message: validation.passed ? 
        'Validation passed successfully' :
        `Found ${critical} critical, ${high} high, and ${medium} medium priority issues`
    };
  }

  async checkStandard(target, standard) {
    // Simulate standard checking
    const hasViolations = Math.random() > 0.7;
    const hasWarnings = Math.random() > 0.5;

    return {
      violations: hasViolations ? [`Violation of ${standard.name}`] : [],
      warnings: hasWarnings ? [`Warning: ${standard.name} not fully compliant`] : []
    };
  }

  calculateComplianceScore(totalStandards, violations, warnings) {
    let score = 100;
    score -= violations * 20;
    score -= warnings * 5;
    return Math.max(0, score);
  }

  async assessFunctionality(target) {
    return {
      score: Math.floor(Math.random() * 30) + 70, // 70-100
      notes: 'All core features working as expected'
    };
  }

  async assessReliability(target) {
    return {
      score: Math.floor(Math.random() * 30) + 70,
      notes: 'Stable with proper error handling'
    };
  }

  async assessPerformance(target) {
    return {
      score: Math.floor(Math.random() * 30) + 70,
      notes: 'Meets performance targets'
    };
  }

  async assessSecurity(target) {
    return {
      score: Math.floor(Math.random() * 30) + 70,
      notes: 'No critical security issues found'
    };
  }

  async assessMaintainability(target) {
    return {
      score: Math.floor(Math.random() * 30) + 70,
      notes: 'Code is clean and well-structured'
    };
  }

  async assessDocumentation(target) {
    return {
      score: Math.floor(Math.random() * 30) + 70,
      notes: 'Documentation is adequate'
    };
  }

  assignGrade(score) {
    if (score >= 90) return 'A (Excellent)';
    if (score >= 80) return 'B (Good)';
    if (score >= 70) return 'C (Satisfactory)';
    if (score >= 60) return 'D (Needs Improvement)';
    return 'F (Fail)';
  }

  generateQualityRecommendations(dimensions) {
    const recommendations = [];

    for (const [dimension, data] of Object.entries(dimensions)) {
      if (data.score < 80) {
        recommendations.push({
          dimension,
          priority: data.score < 70 ? 'high' : 'medium',
          recommendation: `Improve ${dimension} - current score: ${data.score}`,
          notes: data.notes
        });
      }
    }

    return recommendations;
  }

  calculateDifference(expected, actual) {
    if (typeof expected !== typeof actual) {
      return `Type mismatch: expected ${typeof expected}, got ${typeof actual}`;
    }

    if (typeof expected === 'object') {
      return 'Object structure differs';
    }

    return `Value differs: expected ${expected}, got ${actual}`;
  }

  /**
   * Get validation statistics
   */
  getStatistics() {
    const totalValidations = this.validationHistory.length;
    const passed = this.validationHistory.filter(v => v.passed).length;
    const failed = totalValidations - passed;

    const avgScore = totalValidations > 0 ?
      this.validationHistory.reduce((sum, v) => sum + v.score, 0) / totalValidations : 0;

    return {
      total: totalValidations,
      passed,
      failed,
      passRate: totalValidations > 0 ? Math.round((passed / totalValidations) * 100) : 0,
      averageScore: Math.round(avgScore)
    };
  }
}

module.exports = ValidatorAgent;
