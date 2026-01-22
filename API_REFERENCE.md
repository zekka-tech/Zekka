# API Reference

Complete API documentation for Zekka Framework - Multi-Agent AI Orchestration Platform

**Base URL:** `http://localhost:3000`  
**API Version:** 3.0.0

---

## Table of Contents

1. [Authentication](#authentication)
2. [Health & Status](#health--status)
3. [Projects](#projects)
4. [Costs](#costs)
5. [Metrics](#metrics)
6. [WebSocket Events](#websocket-events)
7. [Error Codes](#error-codes)
8. [Rate Limits](#rate-limits)

---

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Register

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "userId": "user_1705234567890_abc123",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2026-01-13T10:30:00.000Z"
}
```

**Rate Limit:** 5 requests per 15 minutes per IP

---

### Login

Authenticate and receive a JWT token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "user_1705234567890_abc123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Token Expiration:** 24 hours (configurable via `JWT_EXPIRATION`)

**Rate Limit:** 5 requests per 15 minutes per IP

---

### Get Current User

Retrieve information about the currently authenticated user.

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "userId": "user_1705234567890_abc123",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2026-01-13T10:30:00.000Z"
}
```

---

## Health & Status

### System Health

Check the health status of all system components.

**Endpoint:** `GET /health`

**Response:** `200 OK` (healthy) or `503 Service Unavailable` (unhealthy)
```json
{
  "status": "healthy",
  "timestamp": "2026-01-13T12:00:00.000Z",
  "uptime": 3600.5,
  "services": {
    "contextBus": true,
    "orchestrator": true
  }
}
```

**Services:**
- `contextBus`: Redis Context Bus connection status
- `orchestrator`: Orchestrator service readiness

---

### Prometheus Metrics

Export system metrics in Prometheus format.

**Endpoint:** `GET /metrics`

**Response:** `200 OK` (Content-Type: text/plain)
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/projects",status_code="200"} 150

# HELP zekka_active_agents Number of currently active AI agents
# TYPE zekka_active_agents gauge
zekka_active_agents 23

# HELP zekka_projects_completed_total Total number of completed projects
# TYPE zekka_projects_completed_total counter
zekka_projects_completed_total{status="success"} 42
```

---

## Projects

### Create Project

Create a new AI orchestration project.

**Endpoint:** `POST /api/projects`

**Request Body:**
```json
{
  "name": "Todo Application",
  "requirements": [
    "User authentication with JWT",
    "CRUD operations for tasks",
    "REST API with Express.js",
    "PostgreSQL database",
    "React frontend with Material-UI",
    "Unit and integration tests",
    "Docker deployment configuration"
  ],
  "storyPoints": 8,
  "budget": {
    "daily": 50,
    "monthly": 1000
  }
}
```

**Parameters:**
- `name` (string, required): Project name
- `requirements` (array of strings, required): List of project requirements
- `storyPoints` (integer, optional, default: 8): Agile story points (1-13)
- `budget` (object, optional): Budget constraints
  - `daily` (number): Daily budget in USD
  - `monthly` (number): Monthly budget in USD

**Response:** `201 Created`
```json
{
  "projectId": "proj_1705234567890_xyz789",
  "name": "Todo Application",
  "requirements": [...],
  "storyPoints": 8,
  "budget": {
    "daily": 50,
    "monthly": 1000
  },
  "status": "pending",
  "createdAt": "2026-01-13T12:30:00.000Z",
  "userId": "user_1705234567890_abc123"
}
```

**Rate Limit:** 10 projects per hour per IP

---

### Execute Project

Start the AI orchestration workflow for a project.

**Endpoint:** `POST /api/projects/:projectId/execute`

**Parameters:**
- `projectId` (path, required): Unique project identifier

**Response:** `200 OK`
```json
{
  "message": "Execution started",
  "projectId": "proj_1705234567890_xyz789",
  "status": "running"
}
```

**Note:** Execution is asynchronous. Subscribe to WebSocket events for real-time progress updates.

---

### Get Project

Retrieve detailed information about a specific project.

**Endpoint:** `GET /api/projects/:projectId`

**Parameters:**
- `projectId` (path, required): Unique project identifier

**Response:** `200 OK`
```json
{
  "projectId": "proj_1705234567890_xyz789",
  "name": "Todo Application",
  "requirements": [...],
  "storyPoints": 8,
  "budget": {
    "daily": 50,
    "monthly": 1000
  },
  "status": "completed",
  "progress": {
    "currentStage": 10,
    "totalStages": 10,
    "percentage": 100
  },
  "metrics": {
    "activeAgents": 0,
    "completedTasks": 87,
    "successRate": 97.5
  },
  "cost": {
    "total": 12.45,
    "breakdown": {
      "gemini": 8.30,
      "claude": 0.00,
      "ollama": 0.00
    }
  },
  "createdAt": "2026-01-13T12:30:00.000Z",
  "startedAt": "2026-01-13T12:35:00.000Z",
  "completedAt": "2026-01-13T12:47:23.000Z",
  "userId": "user_1705234567890_abc123"
}
```

**Project Status:**
- `pending`: Project created, awaiting execution
- `running`: Project execution in progress
- `completed`: Project successfully completed
- `failed`: Project execution failed

---

### List Projects

Retrieve a list of all projects.

**Endpoint:** `GET /api/projects`

**Query Parameters:**
- `status` (optional): Filter by status (pending, running, completed, failed)
- `limit` (optional, default: 50): Maximum number of results
- `offset` (optional, default: 0): Pagination offset

**Response:** `200 OK`
```json
{
  "projects": [
    {
      "projectId": "proj_1705234567890_xyz789",
      "name": "Todo Application",
      "status": "completed",
      "storyPoints": 8,
      "createdAt": "2026-01-13T12:30:00.000Z",
      "completedAt": "2026-01-13T12:47:23.000Z"
    },
    {
      "projectId": "proj_1705234567891_abc456",
      "name": "E-commerce API",
      "status": "running",
      "storyPoints": 13,
      "createdAt": "2026-01-13T13:00:00.000Z"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

---

## Costs

### Get Cost Summary

Retrieve cost information for projects.

**Endpoint:** `GET /api/costs`

**Query Parameters:**
- `projectId` (optional): Filter by specific project
- `period` (optional, default: daily): Cost reporting period (daily, weekly, monthly)

**Response:** `200 OK`
```json
{
  "period": "daily",
  "totalCost": 45.67,
  "projects": [
    {
      "projectId": "proj_1705234567890_xyz789",
      "name": "Todo Application",
      "cost": 12.45,
      "breakdown": {
        "gemini": 8.30,
        "claude": 0.00,
        "openai": 0.00,
        "ollama": 0.00
      }
    },
    {
      "projectId": "proj_1705234567891_abc456",
      "name": "E-commerce API",
      "cost": 33.22,
      "breakdown": {
        "gemini": 25.50,
        "claude": 7.72,
        "openai": 0.00,
        "ollama": 0.00
      }
    }
  ],
  "savings": {
    "withOllama": 36.54,
    "percentage": 80
  }
}
```

**Model Pricing (per 1M tokens):**
- **Gemini Pro:** $0.50 (primary)
- **Claude Sonnet:** $3.00 (fallback)
- **GPT-4:** $30.00 (optional)
- **Ollama:** $0.00 (local, free)

---

## Metrics

### Get System Metrics

Retrieve comprehensive system metrics and statistics.

**Endpoint:** `GET /api/metrics`

**Response:** `200 OK`
```json
{
  "timestamp": "2026-01-13T14:00:00.000Z",
  "system": {
    "uptime": 86400,
    "version": "2.0.0",
    "environment": "production"
  },
  "projects": {
    "total": 150,
    "active": 5,
    "completed": 142,
    "failed": 3,
    "successRate": 97.3
  },
  "agents": {
    "active": 23,
    "totalExecuted": 7500,
    "averageExecutionTime": 45.2,
    "successRate": 98.1
  },
  "costs": {
    "today": 45.67,
    "thisWeek": 210.34,
    "thisMonth": 823.56,
    "savingsWithOllama": 3294.24
  },
  "conflicts": {
    "total": 234,
    "resolved": 215,
    "resolutionRate": 91.9,
    "byMethod": {
      "gemini": 154,
      "claude": 42,
      "ollama": 19,
      "manual": 19
    }
  },
  "performance": {
    "avgProjectTime": 12.3,
    "p50ResponseTime": 85,
    "p95ResponseTime": 420,
    "p99ResponseTime": 850
  }
}
```

---

## WebSocket Events

Connect to the WebSocket server for real-time updates.

**WebSocket URL:** `ws://localhost:3000/ws`

### Connection

**Client → Server:**
```javascript
const socket = io('http://localhost:3000', { path: '/ws' });

socket.on('connected', (data) => {
  console.log('Connected:', data);
  // { message: 'Connected to Zekka Framework', socketId: '...', timestamp: '...' }
});
```

---

### Subscribe to Project

Receive real-time updates for a specific project.

**Client → Server:**
```javascript
socket.emit('subscribe:project', 'proj_1705234567890_xyz789');

socket.on('subscribed', (data) => {
  console.log('Subscribed to project:', data.projectId);
});
```

**Server → Client Events:**

#### project:update
General project updates
```javascript
socket.on('project:update', (data) => {
  // {
  //   projectId: 'proj_...',
  //   timestamp: '2026-01-13T12:35:00.000Z',
  //   status: 'running',
  //   progress: { currentStage: 3, totalStages: 10, percentage: 30 }
  // }
});
```

#### project:stage
Stage transition updates
```javascript
socket.on('project:stage', (data) => {
  // {
  //   projectId: 'proj_...',
  //   stage: 3,
  //   name: 'Database Schema',
  //   status: 'started',
  //   timestamp: '2026-01-13T12:35:00.000Z'
  // }
});
```

#### project:agent
Agent activity updates
```javascript
socket.on('project:agent', (data) => {
  // {
  //   projectId: 'proj_...',
  //   agent: {
  //     id: 'agent_schema_designer',
  //     name: 'Schema Designer',
  //     stage: 3,
  //     task: 'Designing database schema'
  //   },
  //   activity: 'started',
  //   timestamp: '2026-01-13T12:35:00.000Z'
  // }
});
```

#### project:conflict
Conflict detection and resolution updates
```javascript
socket.on('project:conflict', (data) => {
  // {
  //   projectId: 'proj_...',
  //   conflict: {
  //     id: 'conflict_123',
  //     type: 'code',
  //     file: 'src/models/User.js',
  //     resolution: 'auto',
  //     method: 'gemini',
  //     success: true
  //   },
  //   timestamp: '2026-01-13T12:36:00.000Z'
  // }
});
```

#### project:cost
Real-time cost tracking updates
```javascript
socket.on('project:cost', (data) => {
  // {
  //   projectId: 'proj_...',
  //   cost: {
  //     total: 5.67,
  //     breakdown: { gemini: 3.45, claude: 2.22, ollama: 0 }
  //   },
  //   timestamp: '2026-01-13T12:37:00.000Z'
  // }
});
```

#### project:complete
Project completion notification
```javascript
socket.on('project:complete', (data) => {
  // {
  //   projectId: 'proj_...',
  //   status: 'completed',
  //   metrics: {
  //     completedTasks: 87,
  //     successRate: 97.5,
  //     totalCost: 12.45,
  //     duration: 742
  //   },
  //   timestamp: '2026-01-13T12:47:23.000Z'
  // }
});
```

#### project:error
Project execution error notification
```javascript
socket.on('project:error', (data) => {
  // {
  //   projectId: 'proj_...',
  //   error: 'Budget exceeded',
  //   timestamp: '2026-01-13T12:40:00.000Z'
  // }
});
```

---

### Subscribe to System Metrics

Receive real-time system-wide metrics.

**Client → Server:**
```javascript
socket.emit('subscribe:metrics');

socket.on('subscribed:metrics', (data) => {
  console.log('Subscribed to system metrics');
});
```

**Server → Client Event:**

#### system:metrics
```javascript
socket.on('system:metrics', (data) => {
  // {
  //   timestamp: '2026-01-13T14:00:00.000Z',
  //   activeProjects: 5,
  //   activeAgents: 23,
  //   totalCostToday: 45.67
  // }
});
```

---

### Unsubscribe from Project

Stop receiving updates for a specific project.

**Client → Server:**
```javascript
socket.emit('unsubscribe:project', 'proj_1705234567890_xyz789');

socket.on('unsubscribed', (data) => {
  console.log('Unsubscribed from project:', data.projectId);
});
```

---

### Ping/Pong

Health check for WebSocket connection.

**Client → Server:**
```javascript
socket.emit('ping');

socket.on('pong', (data) => {
  console.log('Pong received:', data.timestamp);
});
```

---

## Error Codes

### HTTP Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

**Examples:**

**400 Bad Request:**
```json
{
  "error": "Missing required fields: name, requirements (array)"
}
```

**401 Unauthorized:**
```json
{
  "error": "Authentication required",
  "message": "Please provide a valid Bearer token in Authorization header"
}
```

**404 Not Found:**
```json
{
  "error": "Project not found"
}
```

**429 Too Many Requests:**
```json
{
  "error": "Too many requests from this IP, please try again after 15 minutes"
}
```

---

## Rate Limits

### API Endpoints

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| General API | 100 requests | 15 minutes |
| POST /api/projects | 10 requests | 1 hour |
| POST /api/auth/register | 5 requests | 15 minutes |
| POST /api/auth/login | 5 requests | 15 minutes |

### Rate Limit Headers

All responses include rate limit information:

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1705238400
```

### Exceeding Rate Limits

When rate limit is exceeded, the API returns `429 Too Many Requests`:

```json
{
  "error": "Too many requests from this IP, please try again after 15 minutes"
}
```

---

## Example Usage

### Complete Project Workflow

```javascript
// 1. Register user
const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securePass123',
    name: 'John Doe'
  })
});
const { userId } = await registerResponse.json();

// 2. Login
const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securePass123'
  })
});
const { token } = await loginResponse.json();

// 3. Create project
const projectResponse = await fetch('http://localhost:3000/api/projects', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Todo App',
    requirements: [
      'User authentication',
      'CRUD operations',
      'REST API'
    ],
    storyPoints: 8
  })
});
const { projectId } = await projectResponse.json();

// 4. Connect WebSocket
const socket = io('http://localhost:3000', { path: '/ws' });

// 5. Subscribe to project updates
socket.emit('subscribe:project', projectId);

socket.on('project:update', (data) => {
  console.log('Project update:', data);
});

socket.on('project:complete', (data) => {
  console.log('Project completed!', data);
});

// 6. Execute project
await fetch(`http://localhost:3000/api/projects/${projectId}/execute`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 7. Monitor progress via WebSocket events...
```

---

## Interactive API Documentation

For interactive API testing, visit the Swagger UI:

**URL:** http://localhost:3000/api/docs

Features:
- Try out all endpoints directly from the browser
- View request/response schemas
- Automatic authentication handling
- Example requests and responses

---

**Version:** 2.0.0  
**Last Updated:** January 2026  
**Support:** https://github.com/zekka-tech/Zekka
