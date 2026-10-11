/**
 * Billing Validation Schemas
 * Joi schemas for Stripe billing operations.
 */
import Joi = require('joi');

const billingSchemas = {
  tenantIdParam: Joi.object({
    tenantId: Joi.string().uuid().required()
  }),

  createCheckout: Joi.object({
    plan: Joi.string().min(1).max(50).required()
      .messages({ 'any.required': 'A plan is required to start checkout' })
  }),

  usageQuery: Joi.object({
    since: Joi.date().iso().optional()
  })
};

export = billingSchemas;
