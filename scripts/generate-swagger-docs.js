/**
 * OpenAPI/Swagger Documentation Generator
 * 
 * Generates comprehensive API documentation
 * from code annotations and route definitions
 * 
 * Usage:
 *   node scripts/generate-swagger-docs.js
 *   npm run docs:generate
 */

const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Zekka Framework API',
    version: '3.0.0',
    description: `
# Zekka Framework API Documentation

Enterprise-grade AI orchestration platform with 95+ integrated tools.

## Features

- **Authentication & Authorization**: JWT-based with MFA support
- **RESTful API**: Clean, intuitive endpoints
- **Rate Limiting**: Protect against abuse
- **Comprehensive Security**: OWASP Top 10 compliance
- **Real-time Monitoring**: Prometheus metrics
- **Audit Logging**: Complete activity tracking

## Authentication

All API endpoints (except public ones) require authentication via JWT token:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

To obtain a token, use the \`/api/auth/login\` endpoint.

## Rate Limiting

API requests are rate-limited to prevent abuse:
- **Default**: 100 requests per minute per IP
- **Authenticated**: 1000 requests per minute per user

Rate limit headers:
- \`X-RateLimit-Limit\`: Request limit
- \`X-RateLimit-Remaining\`: Remaining requests
- \`X-RateLimit-Reset\`: Reset timestamp

## Error Handling

All errors follow a consistent format:

\`\`\`json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2026-01-15T12:00:00.000Z"
}
\`\`\`

Common error codes:
- \`AUTHENTICATION_REQUIRED\`: Missing or invalid auth token
- \`AUTHORIZATION_FAILED\`: Insufficient permissions
- \`VALIDATION_ERROR\`: Invalid request data
- \`RATE_LIMIT_EXCEEDED\`: Too many requests
- \`INTERNAL_ERROR\`: Server error

## Pagination

List endpoints support pagination:

Query parameters:
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 10, max: 100)

Response:
\`\`\`json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
\`\`\`
    `,
    contact: {
      name: 'Zekka Technologies',
      email: 'support@zekka.tech',
      url: 'https://zekka.tech',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://staging-api.zekka.tech',
      description: 'Staging server',
    },
    {
      url: 'https://api.zekka.tech',
      description: 'Production server',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization',
    },
    {
      name: 'Users',
      description: 'User management operations',
    },
    {
      name: 'Resources',
      description: 'Resource CRUD operations',
    },
    {
      name: 'Security',
      description: 'Security features (MFA, password policies, etc.)',
    },
    {
      name: 'Audit',
      description: 'Audit logging and compliance',
    },
    {
      name: 'Health',
      description: 'Health check and status endpoints',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /api/auth/login',
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for service-to-service communication',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'string',
            example: 'Error message',
          },
          code: {
            type: 'string',
            example: 'ERROR_CODE',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          email: {
            type: 'string',
            format: 'email',
          },
          firstName: {
            type: 'string',
          },
          lastName: {
            type: 'string',
          },
          role: {
            type: 'string',
            enum: ['user', 'admin', 'superadmin'],
          },
          mfaEnabled: {
            type: 'boolean',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com',
          },
          password: {
            type: 'string',
            format: 'password',
            example: 'SecurePassword123!',
          },
          mfaCode: {
            type: 'string',
            pattern: '^[0-9]{6}$',
            example: '123456',
            description: 'Required if MFA is enabled',
          },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          token: {
            type: 'string',
            description: 'JWT access token',
          },
          refreshToken: {
            type: 'string',
            description: 'JWT refresh token',
          },
          user: {
            $ref: '#/components/schemas/User',
          },
          mfaRequired: {
            type: 'boolean',
            description: 'True if MFA code is required',
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            example: 1,
          },
          limit: {
            type: 'integer',
            example: 10,
          },
          total: {
            type: 'integer',
            example: 100,
          },
          pages: {
            type: 'integer',
            example: 10,
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Authentication required',
              code: 'AUTHENTICATION_REQUIRED',
            },
          },
        },
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Insufficient permissions',
              code: 'AUTHORIZATION_FAILED',
            },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Resource not found',
              code: 'NOT_FOUND',
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: {
                email: 'Invalid email format',
              },
            },
          },
        },
      },
      RateLimitExceeded: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Rate limit exceeded',
              code: 'RATE_LIMIT_EXCEEDED',
            },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

// Swagger options
const options = {
  swaggerDefinition,
  apis: [
    './src/routes/*.js',
    './src/routes/**/*.js',
    './src/middleware/*.js',
    './src/index.js',
  ],
};

/**
 * Generate Swagger specification
 */
function generateSwaggerSpec() {
  console.log('🔧 Generating OpenAPI/Swagger documentation...\n');
  
  try {
    const swaggerSpec = swaggerJsdoc(options);
    
    // Write to file
    const outputPath = path.join(__dirname, '../docs/swagger.json');
    const docsDir = path.join(__dirname, '../docs');
    
    // Create docs directory if it doesn't exist
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
    
    console.log('✅ Swagger specification generated successfully!');
    console.log(`📄 Output: ${outputPath}`);
    console.log(`📊 Endpoints documented: ${countEndpoints(swaggerSpec)}`);
    console.log(`🏷️  Tags: ${swaggerSpec.tags?.length || 0}`);
    console.log(`📋 Schemas: ${Object.keys(swaggerSpec.components?.schemas || {}).length}`);
    console.log('\n📖 View documentation:');
    console.log('   http://localhost:3000/api-docs');
    
    return swaggerSpec;
  } catch (error) {
    console.error('❌ Error generating Swagger documentation:', error.message);
    process.exit(1);
  }
}

/**
 * Count endpoints in specification
 */
function countEndpoints(spec) {
  let count = 0;
  if (spec.paths) {
    Object.values(spec.paths).forEach(path => {
      count += Object.keys(path).length;
    });
  }
  return count;
}

// Run if executed directly
if (require.main === module) {
  generateSwaggerSpec();
}

module.exports = { generateSwaggerSpec };
