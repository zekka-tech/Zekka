/**
 * Agent Registry Validation Schemas
 */
import Joi = require('joi');

const agentRegistrySchemas = {
  registerAgent: Joi.object({
    agentKey: Joi.string()
      .pattern(/^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$/)
      .required()
      .messages({
        'string.pattern.base':
          'agentKey must be lowercase alphanumeric with hyphens'
      }),
    name: Joi.string().min(1).max(255).required(),
    tier: Joi.number().integer().min(1).max(5)
      .optional(),
    description: Joi.string().max(2000).optional(),
    capabilities: Joi.array().items(Joi.string().max(100)).optional(),
    systemPrompt: Joi.string().max(20000).optional(),
    tools: Joi.array().items(Joi.string().max(100)).optional(),
    model: Joi.string().max(100).optional().allow(null)
  })
};

export = agentRegistrySchemas;
