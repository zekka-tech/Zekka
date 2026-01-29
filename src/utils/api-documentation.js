/**
 * API Documentation Generator
 * OpenAPI 3.0 specification for Zekka Framework API
 *
 * Features:
 * - Auto-generated API documentation
 * - Interactive Swagger UI
 * - API versioning support
 * - Authentication documentation
 * - Example requests and responses
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * Swagger/OpenAPI configuration
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Zekka Framework API',
      version: '2.0.0',
      description: `
# Zekka Framework API Documentation

Welcome to the Zekka Framework API documentation. This API provides enterprise-grade multi-agent orchestration with comprehensive security features.

## Features

- 🤖 **Multi-Agent Orchestration**: Coordinate 50+ AI agents for complex tasks
- 🔐 **Enterprise Security**: JWT authentication, RBAC, audit logging
- 📊 **Performance Monitoring**: Real-time metrics and health checks
- 🚀 **High Performance**: Redis caching, connection pooling, circuit breakers
- 📝 **API Versioning**: Backward-compatible API evolution

## Authentication

All protected endpoints require a valid JWT token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

To obtain a token, use the \`POST /api/v1/auth/login\` endpoint.

## Rate Limiting

API requests are rate-limited to prevent abuse:
- **Authenticated**: 1000 requests per hour
- **Unauthenticated**: 100 requests per hour

## Error Handling

The API uses standard HTTP status codes and returns errors in the following format:

\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456"
  }
}
\`\`\`

## Support

For issues or questions, visit: https://github.com/zekka-tech/Zekka
      `,
      contact: {
        name: 'Zekka Framework Support',
        url: 'https://github.com/zekka-tech/Zekka',
        email: 'support@zekka-framework.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.zekka-framework.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR'
                },
                message: {
                  type: 'string',
                  example: 'Validation failed'
                },
                details: {
                  type: 'object'
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time'
                },
                requestId: {
                  type: 'string'
                }
              }
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com'
            },
            name: {
              type: 'string',
              example: 'John Doe'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            last_login: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com'
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'SecurePass123!'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User'
                },
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                }
              }
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'newuser@example.com'
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 12,
              example: 'SecurePass123!'
            },
            name: {
              type: 'string',
              example: 'Jane Smith'
            }
          }
        },
        TaskRequest: {
          type: 'object',
          required: ['description'],
          properties: {
            description: {
              type: 'string',
              example: 'Build a REST API with Express.js'
            },
            context: {
              type: 'object',
              example: {
                framework: 'Express.js',
                database: 'PostgreSQL'
              }
            },
            options: {
              type: 'object',
              properties: {
                maxAgents: {
                  type: 'integer',
                  example: 10
                },
                timeout: {
                  type: 'integer',
                  example: 300000
                }
              }
            },
            budget: {
              type: 'object',
              properties: {
                daily: {
                  type: 'integer',
                  example: 50
                },
                monthly: {
                  type: 'integer',
                  example: 1000
                }
              }
            }
          }
        },
        TaskResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                result: {
                  type: 'object'
                },
                metrics: {
                  type: 'object',
                  properties: {
                    duration: {
                      type: 'integer',
                      example: 45000
                    },
                    agentsUsed: {
                      type: 'integer',
                      example: 8
                    },
                    tokensUsed: {
                      type: 'integer',
                      example: 15000
                    }
                  }
                }
              }
            }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'],
              example: 'healthy'
            },
            version: {
              type: 'string',
              example: '2.0.0'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            components: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'healthy'
                    }
                  }
                },
                redis: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'healthy'
                    }
                  }
                },
                orchestrator: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'healthy'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Orchestration',
        description: 'Multi-agent task orchestration endpoints'
      },
      {
        name: 'Health',
        description: 'System health and monitoring endpoints'
      },
      {
        name: 'Metrics',
        description: 'Performance metrics and statistics'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/index.js']
};

/**
 * Generate Swagger specification
 */
const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Setup API documentation middleware
 * @param {Express.Application} app - Express app
 */
function setupApiDocs(app) {
  // Serve Swagger UI
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Zekka Framework API Docs',
      customfavIcon: '/favicon.ico'
    })
  );

  // Serve OpenAPI JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 API Documentation available at: /api-docs');
}

/**
 * JSDoc examples for route documentation
 *
 * Add these comments above your route handlers:
 *
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * @swagger
 * /api/v1/orchestrator/execute:
 *   post:
 *     summary: Execute multi-agent task
 *     tags: [Orchestration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskRequest'
 *     responses:
 *       200:
 *         description: Task executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Task execution failed
 *
 * @swagger
 * /health:
 *   get:
 *     summary: System health check
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: System health status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */

module.exports = {
  setupApiDocs,
  swaggerSpec
};
