/**
 * Conversation Validation Schemas
 * Joi validation schemas for conversation and message operations
 */

const Joi = require('joi');

const conversationSchemas = {
  // Create conversation
  createConversation: Joi.object({
    title: Joi.string().min(1).max(255).required()
      .messages({
        'string.empty': 'Conversation title is required',
        'string.max': 'Title must be less than 255 characters',
        'any.required': 'Conversation title is required'
      }),
    projectId: Joi.string().uuid().required().messages({
      'string.guid': 'Invalid project ID format',
      'any.required': 'Project ID is required'
    }),
    metadata: Joi.object({
      tags: Joi.array().items(Joi.string()).optional(),
      description: Joi.string().max(500).optional(),
      aiModel: Joi.string().optional(),
      systemPrompt: Joi.string().max(5000).optional()
    }).optional()
  }),

  // Update conversation
  updateConversation: Joi.object({
    title: Joi.string().min(1).max(255).optional()
      .messages({
        'string.empty': 'Title cannot be empty',
        'string.max': 'Title must be less than 255 characters'
      }),
    metadata: Joi.object({
      tags: Joi.array().items(Joi.string()).optional(),
      description: Joi.string().max(500).optional(),
      aiModel: Joi.string().optional(),
      systemPrompt: Joi.string().max(5000).optional()
    }).optional()
  })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided for update'
    }),

  // List conversations query params
  listConversations: Joi.object({
    projectId: Joi.string().uuid().optional().messages({
      'string.guid': 'Invalid project ID format'
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
    offset: Joi.number().integer().min(0).default(0)
      .optional()
      .messages({
        'number.min': 'Offset cannot be negative'
      })
  }),

  // Conversation ID param
  conversationId: Joi.object({
    id: Joi.string().uuid().required().messages({
      'string.guid': 'Invalid conversation ID format',
      'any.required': 'Conversation ID is required'
    })
  }),

  // Send message
  sendMessage: Joi.object({
    content: Joi.string().min(1).max(50000).required()
      .messages({
        'string.empty': 'Message content is required',
        'string.max': 'Message content must be less than 50000 characters',
        'any.required': 'Message content is required'
      }),
    role: Joi.string()
      .valid('user', 'assistant', 'system')
      .default('user')
      .optional()
      .messages({
        'any.only': 'Role must be one of: user, assistant, system'
      }),
    metadata: Joi.object({
      model: Joi.string().optional(),
      temperature: Joi.number().min(0).max(2).optional(),
      citations: Joi.array()
        .items(
          Joi.object({
            text: Joi.string().required(),
            source: Joi.string().required(),
            page: Joi.number().optional(),
            url: Joi.string().uri().optional()
          })
        )
        .optional(),
      tokens: Joi.object({
        input: Joi.number().integer().min(0).optional(),
        output: Joi.number().integer().min(0).optional(),
        total: Joi.number().integer().min(0).optional()
      }).optional(),
      cost: Joi.number().min(0).optional(),
      processingTime: Joi.number().min(0).optional()
    }).optional()
  }),

  // Update message
  updateMessage: Joi.object({
    content: Joi.string().min(1).max(50000).optional()
      .messages({
        'string.empty': 'Message content cannot be empty',
        'string.max': 'Message content must be less than 50000 characters'
      }),
    metadata: Joi.object({
      model: Joi.string().optional(),
      temperature: Joi.number().min(0).max(2).optional(),
      citations: Joi.array()
        .items(
          Joi.object({
            text: Joi.string().required(),
            source: Joi.string().required(),
            page: Joi.number().optional(),
            url: Joi.string().uri().optional()
          })
        )
        .optional(),
      tokens: Joi.object({
        input: Joi.number().integer().min(0).optional(),
        output: Joi.number().integer().min(0).optional(),
        total: Joi.number().integer().min(0).optional()
      }).optional(),
      cost: Joi.number().min(0).optional(),
      processingTime: Joi.number().min(0).optional()
    }).optional()
  })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided for update'
    }),

  // Get messages query params
  getMessages: Joi.object({
    limit: Joi.number()
      .integer()
      .min(1)
      .max(200)
      .default(50)
      .optional()
      .messages({
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 200'
      }),
    offset: Joi.number().integer().min(0).default(0)
      .optional()
      .messages({
        'number.min': 'Offset cannot be negative'
      })
  }),

  // Message ID param
  messageId: Joi.object({
    id: Joi.string().uuid().required().messages({
      'string.guid': 'Invalid conversation ID format',
      'any.required': 'Conversation ID is required'
    }),
    msgId: Joi.string().uuid().required().messages({
      'string.guid': 'Invalid message ID format',
      'any.required': 'Message ID is required'
    })
  })
};

module.exports = conversationSchemas;
