/**
 * Tenant Validation Schemas
 * Joi validation schemas for tenant (multi-tenancy) operations
 */
import Joi = require('joi');

const tenantRoles = ['owner', 'admin', 'member', 'viewer'];
const subscriptionStatuses = [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'suspended'
];

const tenantSchemas = {
  createTenant: Joi.object({
    name: Joi.string().min(1).max(255).required()
      .messages({
        'string.empty': 'Tenant name is required',
        'any.required': 'Tenant name is required'
      }),
    slug: Joi.string()
      .pattern(/^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/)
      .required()
      .messages({
        'string.pattern.base':
          'Slug must be lowercase alphanumeric with hyphens (max 100 chars)',
        'any.required': 'Tenant slug is required'
      }),
    plan: Joi.string()
      .valid('free', 'starter', 'pro', 'enterprise')
      .optional()
  }),

  updateTenant: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    metadata: Joi.object().optional()
  }).min(1),

  updateSubscription: Joi.object({
    plan: Joi.string().valid('free', 'starter', 'pro', 'enterprise').optional(),
    status: Joi.string().valid(...subscriptionStatuses).optional(),
    periodStart: Joi.date().iso().allow(null).optional(),
    periodEnd: Joi.date().iso().allow(null).optional(),
    seatLimit: Joi.number().integer().min(1).max(10000).optional()
  }).min(1),

  // Auth-layer user IDs are opaque strings (users.user_id, e.g.
  // 'user_<ts>_<rand>'), not UUIDs.
  addMember: Joi.object({
    userId: Joi.string().min(1).max(64).required(),
    role: Joi.string().valid(...tenantRoles).optional()
  }),

  updateMember: Joi.object({
    role: Joi.string().valid(...tenantRoles).required()
  }),

  tenantIdParam: Joi.object({
    tenantId: Joi.string().uuid().required()
  }),

  memberParams: Joi.object({
    tenantId: Joi.string().uuid().required(),
    userId: Joi.string().min(1).max(64).required()
  })
};

export = tenantSchemas;
