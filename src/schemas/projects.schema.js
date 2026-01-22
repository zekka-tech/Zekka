/**
 * Project Validation Schemas
 * Joi validation schemas for project-related operations
 */

const Joi = require('joi');

const projectSchemas = {
  // Create project
  createProject: Joi.object({
    name: Joi.string()
      .min(1)
      .max(255)
      .required()
      .messages({
        'string.empty': 'Project name is required',
        'string.max': 'Project name must be less than 255 characters',
        'any.required': 'Project name is required'
      }),
    description: Joi.string()
      .max(1000)
      .allow('')
      .optional()
      .messages({
        'string.max': 'Description must be less than 1000 characters'
      }),
    settings: Joi.object({
      theme: Joi.string().valid('light', 'dark', 'auto').optional(),
      aiModel: Joi.string().optional(),
      temperature: Joi.number().min(0).max(2).optional(),
      maxTokens: Joi.number().min(1).max(100000).optional(),
      systemPrompt: Joi.string().max(5000).optional(),
      enableCitations: Joi.boolean().optional(),
      enableSyntaxHighlight: Joi.boolean().optional()
    }).optional()
  }),

  // Update project
  updateProject: Joi.object({
    name: Joi.string()
      .min(1)
      .max(255)
      .optional()
      .messages({
        'string.empty': 'Project name cannot be empty',
        'string.max': 'Project name must be less than 255 characters'
      }),
    description: Joi.string()
      .max(1000)
      .allow('')
      .optional()
      .messages({
        'string.max': 'Description must be less than 1000 characters'
      }),
    status: Joi.string()
      .valid('active', 'archived', 'deleted')
      .optional()
      .messages({
        'any.only': 'Status must be one of: active, archived, deleted'
      }),
    settings: Joi.object({
      theme: Joi.string().valid('light', 'dark', 'auto').optional(),
      aiModel: Joi.string().optional(),
      temperature: Joi.number().min(0).max(2).optional(),
      maxTokens: Joi.number().min(1).max(100000).optional(),
      systemPrompt: Joi.string().max(5000).optional(),
      enableCitations: Joi.boolean().optional(),
      enableSyntaxHighlight: Joi.boolean().optional()
    }).optional()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),

  // List projects query params
  listProjects: Joi.object({
    status: Joi.string()
      .valid('active', 'archived', 'deleted')
      .optional(),
    search: Joi.string()
      .max(255)
      .optional()
      .messages({
        'string.max': 'Search query must be less than 255 characters'
      }),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
      .optional()
      .messages({
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      }),
    offset: Joi.number()
      .integer()
      .min(0)
      .default(0)
      .optional()
      .messages({
        'number.min': 'Offset cannot be negative'
      })
  }),

  // Project ID param
  projectId: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.guid': 'Invalid project ID format',
        'any.required': 'Project ID is required'
      })
  }),

  // Add member
  addMember: Joi.object({
    userId: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.guid': 'Invalid user ID format',
        'any.required': 'User ID is required'
      }),
    role: Joi.string()
      .valid('owner', 'editor', 'viewer')
      .default('viewer')
      .optional()
      .messages({
        'any.only': 'Role must be one of: owner, editor, viewer'
      })
  }),

  // Remove member param
  removeMember: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.guid': 'Invalid project ID format',
        'any.required': 'Project ID is required'
      }),
    userId: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.guid': 'Invalid user ID format',
        'any.required': 'User ID is required'
      })
  })
};

module.exports = projectSchemas;
