/**
 * Astron Agent - Export Module
 * Exports Astron Agent components and manager
 */

const AstronManager = require('./manager');
const CostOptimizer = require('./cost-optimizer');
const SecurityMonitor = require('./security-monitor');
const ScalabilityOptimizer = require('./scalability-optimizer');

module.exports = {
  AstronManager,
  CostOptimizer,
  SecurityMonitor,
  ScalabilityOptimizer
};
