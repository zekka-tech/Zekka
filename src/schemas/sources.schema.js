/**
 * Sources Validation Schemas
 * Joi schemas for validating source-related requests
 */

const Joi = require('joi');

const sourcesSchemas = {
  /**
   * List sources query parameters
   */
  listSources: Joi.object({
    projectId: Joi.string().uuid().optional(),
    type: Joi.string()
      .valid('file', 'url', 'text', 'github', 'database', 'api')
      .optional(),
    status: Joi.string()
      .valid('pending', 'processing', 'completed', 'failed', 'archived')
      .optional(),
    search: Joi.string().max(255).optional(),
    limit: Joi.number().integer().min(1).max(100)
      .default(20),
    offset: Joi.number().integer().min(0).default(0)
  }),

  /**
   * Create source from file
   */
  createFileSource: Joi.object({
    projectId: Joi.string().uuid().required(),
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional(),
    type: Joi.string().valid('file').required(),
    fileSize: Joi.number().integer().min(1).optional(),
    fileType: Joi.string().max(50).optional(),
    metadata: Joi.object().optional()
  }),

  /**
   * Create source from URL
   */
  createUrlSource: Joi.object({
    projectId: Joi.string().uuid().required(),
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional(),
    type: Joi.string().valid('url').required(),
    url: Joi.string().uri().required(),
    headers: Joi.object().optional(),
    auth: Joi.object({
      type: Joi.string().valid('basic', 'bearer', 'api-key').optional(),
      credentials: Joi.string().optional()
    }).optional(),
    metadata: Joi.object().optional()
  }),

  /**
   * Create source from text
   */
  createTextSource: Joi.object({
    projectId: Joi.string().uuid().required(),
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional(),
    type: Joi.string().valid('text').required(),
    content: Joi.string().min(1).max(1000000).required(),
    language: Joi.string().max(50).optional(),
    metadata: Joi.object().optional()
  }),

  /**
   * Create source from GitHub
   */
  createGithubSource: Joi.object({
    projectId: Joi.string().uuid().required(),
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional(),
    type: Joi.string().valid('github').required(),
    owner: Joi.string().required(),
    repo: Joi.string().required(),
    path: Joi.string().optional(),
    branch: Joi.string().optional(),
    token: Joi.string().optional(),
    metadata: Joi.object().optional()
  }),

  /**
   * Create source from database
   */
  createDatabaseSource: Joi.object({
    projectId: Joi.string().uuid().required(),
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional(),
    type: Joi.string().valid('database').required(),
    databaseType: Joi.string()
      .valid('postgresql', 'mysql', 'mongodb', 'dynamodb', 'elasticsearch')
      .required(),
    connection: Joi.object({
      host: Joi.string().required(),
      port: Joi.number().integer().optional(),
      database: Joi.string().required(),
      username: Joi.string().optional(),
      password: Joi.string().optional(),
      ssl: Joi.boolean().optional()
    }).required(),
    query: Joi.string().optional(),
    metadata: Joi.object().optional()
  }),

  /**
   * Create source from API
   */
  createApiSource: Joi.object({
    projectId: Joi.string().uuid().required(),
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional(),
    type: Joi.string().valid('api').required(),
    baseUrl: Joi.string().uri().required(),
    endpoint: Joi.string().required(),
    method: Joi.string()
      .valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH')
      .default('GET'),
    headers: Joi.object().optional(),
    auth: Joi.object({
      type: Joi.string().valid('bearer', 'api-key', 'basic').required(),
      credentials: Joi.string().required()
    }).optional(),
    params: Joi.object().optional(),
    metadata: Joi.object().optional()
  }),

  /**
   * Update source
   */
  updateSource: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional(),
    status: Joi.string()
      .valid('pending', 'processing', 'completed', 'failed', 'archived')
      .optional(),
    metadata: Joi.object().optional()
  }).min(1),

  /**
   * Source ID parameter
   */
  sourceIdParam: Joi.object({
    id: Joi.string().uuid().required()
  }),

  /**
   * Process source
   */
  processSource: Joi.object({
    format: Joi.string()
      .valid('markdown', 'plain', 'structured', 'chunks')
      .default('markdown'),
    chunkSize: Joi.number().integer().min(100).max(10000)
      .optional(),
    includeMetadata: Joi.boolean().default(true)
  }),

  /**
   * Search source content
   */
  searchSource: Joi.object({
    query: Joi.string().min(1).max(1000).required(),
    limit: Joi.number().integer().min(1).max(100)
      .default(20),
    offset: Joi.number().integer().min(0).default(0)
  }),

  /**
   * Get source chunks
   */
  getSourceChunks: Joi.object({
    limit: Joi.number().integer().min(1).max(100)
      .default(20),
    offset: Joi.number().integer().min(0).default(0),
    format: Joi.string().valid('text', 'json', 'markdown').default('text')
  }),

  /**
   * Sync source
   */
  syncSource: Joi.object({
    force: Joi.boolean().default(false)
  })
};

module.exports = sourcesSchemas;
