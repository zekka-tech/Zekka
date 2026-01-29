/**
 * OpenAPI/Swagger Configuration for Zekka Framework
 * Complete API documentation with all endpoints
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Zekka Framework API',
      version: '2.0.0',
      description:
        'Multi-Agent AI Orchestration Platform API - Complete reference for managing 50+ AI agents across 10 workflow stages',
      contact: {
        name: 'Zekka Tech',
        url: 'https://github.com/zekka-tech/Zekka',
        email: 'support@zekka.tech'
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
        url: 'http://localhost:3000/api',
        description: 'Development API'
      }
    ],
    tags: [
      {
        name: 'Health',
        description: 'System health and status endpoints'
      },
      {
        name: 'Projects',
        description: 'Project management endpoints'
      },
      {
        name: 'Costs',
        description: 'Cost tracking and budget management'
      },
      {
        name: 'Metrics',
        description: 'System metrics and monitoring'
      },
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'WebSocket',
        description: 'Real-time communication endpoints'
      }
    ],
    components: {
      schemas: {
        Project: {
          type: 'object',
          required: ['name', 'requirements'],
          properties: {
            projectId: {
              type: 'string',
              format: 'uuid',
              description: 'Unique project identifier'
            },
            name: {
              type: 'string',
              description: 'Project name',
              example: 'Todo App'
            },
            requirements: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of project requirements',
              example: ['User authentication', 'CRUD operations', 'REST API']
            },
            storyPoints: {
              type: 'integer',
              description: 'Agile story points (1-13)',
              example: 8
            },
            budget: {
              type: 'object',
              properties: {
                daily: {
                  type: 'number',
                  format: 'float',
                  description: 'Daily budget in USD',
                  example: 50
                },
                monthly: {
                  type: 'number',
                  format: 'float',
                  description: 'Monthly budget in USD',
                  example: 1000
                }
              }
            },
            status: {
              type: 'string',
              enum: ['pending', 'running', 'completed', 'failed'],
              description: 'Current project status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Project creation timestamp'
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Project completion timestamp'
            }
          }
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy'],
              description: 'Overall system health status'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Health check timestamp'
            },
            uptime: {
              type: 'number',
              description: 'Server uptime in seconds'
            },
            services: {
              type: 'object',
              properties: {
                contextBus: {
                  type: 'boolean',
                  description: 'Redis Context Bus connection status'
                },
                orchestrator: {
                  type: 'boolean',
                  description: 'Orchestrator readiness status'
                }
              }
            }
          }
        },
        CostSummary: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier'
            },
            period: {
              type: 'string',
              enum: ['daily', 'weekly', 'monthly'],
              description: 'Cost reporting period'
            },
            totalCost: {
              type: 'number',
              format: 'float',
              description: 'Total cost in USD'
            },
            breakdown: {
              type: 'object',
              properties: {
                gemini: { type: 'number', format: 'float' },
                claude: { type: 'number', format: 'float' },
                openai: { type: 'number', format: 'float' },
                ollama: { type: 'number', format: 'float' }
              }
            }
          }
        },
        Metrics: {
          type: 'object',
          properties: {
            activeAgents: {
              type: 'integer',
              description: 'Number of currently active AI agents'
            },
            completedTasks: {
              type: 'integer',
              description: 'Total completed tasks'
            },
            averageExecutionTime: {
              type: 'number',
              format: 'float',
              description: 'Average task execution time in seconds'
            },
            successRate: {
              type: 'number',
              format: 'float',
              description: 'Task success rate (0-100%)'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            message: {
              type: 'string',
              description: 'Detailed error description'
            }
          }
        }
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication token'
        }
      }
    }
  },
  apis: ['./src/index.js', './src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
