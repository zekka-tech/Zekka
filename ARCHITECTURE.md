# Zekka Framework Architecture

## System Overview

Zekka is a multi-agent AI orchestration platform designed to manage 50+ AI agents across 10 workflow stages. The system follows a hub-and-spoke architecture with centralized coordination through a Redis Context Bus.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ZEKKA FRAMEWORK                             │
│                     Multi-Agent AI Orchestration                    │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
           ┌────────▼───────┐    │    ┌────────▼────────┐
           │   Orchestrator │    │    │   AI Arbitrator │
           │   (Port 3000)  │    │    │   (Port 3001)   │
           └────────┬───────┘    │    └────────┬────────┘
                    │             │             │
                    └─────────────┼─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    Redis Context Bus      │
                    │   (Shared State & Lock)   │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
           ┌────────▼───────┐    │    ┌────────▼────────┐
           │   PostgreSQL   │    │    │     Ollama      │
           │   (Database)   │    │    │  (LLM Inference)│
           └────────────────┘    │    └─────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   50+ AI Agents         │
                    │   - Frontend Agents     │
                    │   - Backend Agents      │
                    │   - Database Agents     │
                    │   - Testing Agents      │
                    │   - DevOps Agents       │
                    │   - Documentation Agents│
                    └─────────────────────────┘
```

## Component Architecture

### 1. API Layer (Express.js)

```
┌────────────────────────────────────────────────────┐
│                   API Gateway                      │
│                  (Express.js)                      │
├────────────────────────────────────────────────────┤
│  Middleware:                                       │
│  ┌──────────────────────────────────────────────┐ │
│  │ • Helmet (Security)                          │ │
│  │ • CORS (Cross-Origin)                        │ │
│  │ • Rate Limiting                              │ │
│  │ • Authentication (JWT)                       │ │
│  │ • Prometheus Metrics                         │ │
│  │ • Logging (Winston)                          │ │
│  └──────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────┤
│  Endpoints:                                        │
│  • /health                    Health checks       │
│  • /api/docs                  Swagger UI          │
│  • /metrics                   Prometheus metrics  │
│  • /ws                        WebSocket           │
│  • /api/auth/*                Authentication      │
│  • /api/projects/*            Project management  │
│  • /api/costs                 Cost tracking       │
│  • /api/metrics               System metrics      │
└────────────────────────────────────────────────────┘
```

### 2. Orchestrator Engine

```
┌─────────────────────────────────────────────────────┐
│              Zekka Orchestrator                     │
├─────────────────────────────────────────────────────┤
│  Core Functions:                                    │
│  • Project Creation                                 │
│  • Agent Coordination                               │
│  • Workflow Management                              │
│  • Resource Allocation                              │
│  • Conflict Detection                               │
│  • Budget Enforcement                               │
├─────────────────────────────────────────────────────┤
│  10 Workflow Stages:                                │
│  1. Requirements Analysis                           │
│  2. Architecture Design                             │
│  3. Database Schema                                 │
│  4. API Development                                 │
│  5. Frontend Development                            │
│  6. Integration                                     │
│  7. Testing                                         │
│  8. Documentation                                   │
│  9. Deployment Setup                                │
│  10. Quality Assurance                              │
└─────────────────────────────────────────────────────┘
```

### 3. AI Arbitrator

```
┌──────────────────────────────────────────────────┐
│            AI Arbitrator                         │
│         (Conflict Resolution)                    │
├──────────────────────────────────────────────────┤
│  Resolution Strategies:                          │
│  • Claude-based (92% success rate)               │
│  • Gemini-based (primary model)                  │
│  • Ollama-based (80% success rate)               │
│  • GitHub webhook integration                    │
├──────────────────────────────────────────────────┤
│  Conflict Types:                                 │
│  • Code conflicts                                │
│  • Design conflicts                              │
│  • Requirement conflicts                         │
│  • Resource conflicts                            │
└──────────────────────────────────────────────────┘
```

### 4. Context Bus (Redis)

```
┌─────────────────────────────────────────────────┐
│           Redis Context Bus                     │
│        (Shared Memory & State)                  │
├─────────────────────────────────────────────────┤
│  Key Features:                                  │
│  • File-level locking                           │
│  • State recovery                               │
│  • Race condition prevention                    │
│  • Agent synchronization                        │
│  • Conflict queue management                    │
├─────────────────────────────────────────────────┤
│  Data Structures:                               │
│  • project:{id}:state         Project state     │
│  • project:{id}:locks         File locks        │
│  • project:{id}:conflicts     Conflict queue    │
│  • project:{id}:agents        Active agents     │
│  • system:metrics             System metrics    │
└─────────────────────────────────────────────────┘
```

### 5. Token Economics

```
┌──────────────────────────────────────────────────┐
│          Token Economics System                  │
├──────────────────────────────────────────────────┤
│  Cost Tracking:                                  │
│  • Real-time cost calculation                    │
│  • Per-model cost tracking                       │
│  • Budget enforcement                            │
│  • Automatic model switching                     │
├──────────────────────────────────────────────────┤
│  Model Costs (per 1M tokens):                    │
│  • Gemini Pro: $0.50                            │
│  • Claude Sonnet: $3.00                         │
│  • GPT-4: $30.00                                │
│  • Ollama: $0.00 (local)                        │
├──────────────────────────────────────────────────┤
│  Savings with Ollama: ~80%                       │
└──────────────────────────────────────────────────┘
```

## Agent Architecture

### Agent Types (50+ agents across 10 stages)

```
Stage 1: Requirements Analysis (5 agents)
├── Requirements Parser
├── User Story Generator
├── Acceptance Criteria Creator
├── Risk Analyzer
└── Scope Validator

Stage 2: Architecture Design (6 agents)
├── System Architect
├── Database Designer
├── API Designer
├── Security Architect
├── Performance Planner
└── Tech Stack Selector

Stage 3: Database Schema (5 agents)
├── Schema Designer
├── Migration Creator
├── Seed Data Generator
├── Index Optimizer
└── Relationship Validator

Stage 4: API Development (7 agents)
├── Route Creator
├── Controller Generator
├── Middleware Developer
├── Validation Creator
├── Error Handler
├── Authentication Manager
└── Authorization Manager

Stage 5: Frontend Development (8 agents)
├── Component Generator
├── Page Creator
├── State Manager
├── API Integration Specialist
├── UI/UX Designer
├── Form Handler
├── Routing Manager
└── Asset Optimizer

Stage 6: Integration (5 agents)
├── API Integration Tester
├── Database Integration Validator
├── Third-party Service Integrator
├── WebSocket Handler
└── Event Bus Manager

Stage 7: Testing (7 agents)
├── Unit Test Creator
├── Integration Test Creator
├── E2E Test Creator
├── Performance Tester
├── Security Tester
├── Load Tester
└── Test Coverage Analyzer

Stage 8: Documentation (4 agents)
├── API Documentation Generator
├── README Creator
├── Code Comment Generator
└── User Guide Writer

Stage 9: Deployment (4 agents)
├── Dockerfile Creator
├── CI/CD Pipeline Generator
├── Environment Config Manager
└── Deployment Script Creator

Stage 10: Quality Assurance (4 agents)
├── Code Review Agent
├── Security Audit Agent
├── Performance Audit Agent
└── Final Validation Agent
```

## Data Flow

### Project Creation Flow

```
User Request
    │
    ▼
API Gateway (Rate Limited + Auth)
    │
    ▼
Orchestrator.createProject()
    │
    ├──▶ Validate Requirements
    │
    ├──▶ Generate Project ID
    │
    ├──▶ Store in PostgreSQL
    │
    ├──▶ Initialize Context in Redis
    │
    ├──▶ Setup Budget Tracking
    │
    └──▶ Broadcast WebSocket Event
         │
         ▼
    Return Project
```

### Project Execution Flow

```
Execute Request
    │
    ▼
Orchestrator.executeProject()
    │
    ├──▶ Load Project State (Redis)
    │
    ├──▶ For each Stage (1-10):
    │    │
    │    ├──▶ Select Agents
    │    │
    │    ├──▶ Allocate Resources
    │    │
    │    ├──▶ Execute Agents in Parallel
    │    │    │
    │    │    ├──▶ Agent acquires file lock (Redis)
    │    │    │
    │    │    ├──▶ Agent executes task
    │    │    │
    │    │    ├──▶ Detect conflicts
    │    │    │
    │    │    ├──▶ If conflict → AI Arbitrator
    │    │    │
    │    │    ├──▶ Track token cost
    │    │    │
    │    │    ├──▶ Release lock
    │    │    │
    │    │    └──▶ Broadcast progress (WebSocket)
    │    │
    │    └──▶ Validate stage completion
    │
    ├──▶ Generate final artifacts
    │
    ├──▶ Calculate total cost
    │
    └──▶ Broadcast completion (WebSocket)
```

### Conflict Resolution Flow

```
Conflict Detected
    │
    ▼
Add to Conflict Queue (Redis)
    │
    ▼
AI Arbitrator.resolve()
    │
    ├──▶ Try Gemini (primary)
    │    │
    │    └──▶ Success (92%)? → Apply Resolution
    │
    ├──▶ Try Claude (fallback 1)
    │    │
    │    └──▶ Success (90%)? → Apply Resolution
    │
    ├──▶ Try Ollama (fallback 2)
    │    │
    │    └──▶ Success (80%)? → Apply Resolution
    │
    └──▶ Manual Review Required
         │
         └──▶ Create GitHub Issue
```

## Security Architecture

```
┌─────────────────────────────────────────────┐
│          Security Layers                    │
├─────────────────────────────────────────────┤
│  1. Network Layer                           │
│     • Helmet.js (HTTP headers)              │
│     • CORS policies                         │
│     • Rate limiting                         │
├─────────────────────────────────────────────┤
│  2. Authentication Layer                    │
│     • JWT tokens                            │
│     • Bcrypt password hashing               │
│     • Token expiration                      │
├─────────────────────────────────────────────┤
│  3. Authorization Layer                     │
│     • User-based access control             │
│     • Project ownership validation          │
│     • API key management                    │
├─────────────────────────────────────────────┤
│  4. Data Layer                              │
│     • PostgreSQL connection pooling         │
│     • Redis ACL                             │
│     • Environment variable encryption       │
└─────────────────────────────────────────────┘
```

## Monitoring & Observability

```
┌──────────────────────────────────────────────┐
│         Monitoring Stack                     │
├──────────────────────────────────────────────┤
│  1. Application Metrics (Prometheus)         │
│     • HTTP request duration                  │
│     • Request count by endpoint              │
│     • Active projects                        │
│     • Active agents                          │
│     • Agent execution time                   │
│     • Token cost tracking                    │
│     • Conflict resolution rate               │
├──────────────────────────────────────────────┤
│  2. Real-time Updates (WebSocket)            │
│     • Project progress                       │
│     • Stage transitions                      │
│     • Agent activity                         │
│     • Conflict notifications                 │
│     • Cost updates                           │
├──────────────────────────────────────────────┤
│  3. Logging (Winston)                        │
│     • Application logs                       │
│     • Error logs                             │
│     • Access logs                            │
│     • Audit logs                             │
└──────────────────────────────────────────────┘
```

## Deployment Architecture

### Docker Compose Setup

```
┌────────────────────────────────────────────────┐
│          Docker Compose Stack                  │
├────────────────────────────────────────────────┤
│  zekka-orchestrator                            │
│  ├─ Port: 3000                                 │
│  ├─ Depends: postgres, redis, ollama           │
│  └─ Health: /health endpoint                   │
├────────────────────────────────────────────────┤
│  zekka-arbitrator                              │
│  ├─ Port: 3001                                 │
│  ├─ Depends: postgres, redis, ollama           │
│  └─ Health: /health endpoint                   │
├────────────────────────────────────────────────┤
│  postgres                                      │
│  ├─ Port: 5432                                 │
│  ├─ Volume: postgres_data                      │
│  └─ Health: pg_isready                         │
├────────────────────────────────────────────────┤
│  redis                                         │
│  ├─ Port: 6379                                 │
│  ├─ Volume: redis_data                         │
│  └─ Health: redis-cli ping                     │
├────────────────────────────────────────────────┤
│  ollama                                        │
│  ├─ Port: 11434                                │
│  ├─ Volume: ollama_data                        │
│  ├─ Models: llama3.1:8b, mistral, codellama    │
│  └─ Health: ollama list                        │
└────────────────────────────────────────────────┘
```

### Production Kubernetes (Future)

```
┌────────────────────────────────────────────────┐
│        Kubernetes Cluster (HA)                 │
├────────────────────────────────────────────────┤
│  Orchestrator Deployment (3 replicas)          │
│  Arbitrator Deployment (2 replicas)            │
│  Redis StatefulSet (3 replicas, Sentinel)      │
│  PostgreSQL StatefulSet (HA with replication)  │
│  Ollama Deployment (GPU-enabled nodes)         │
│  Ingress (TLS termination)                     │
│  Horizontal Pod Autoscaler                     │
│  Persistent Volumes                            │
└────────────────────────────────────────────────┘
```

## Scalability Considerations

### Horizontal Scaling

```
Current:
  - 1 Orchestrator instance
  - 1 Arbitrator instance
  - 50+ agents per project

Target (Production):
  - 3-5 Orchestrator instances (load balanced)
  - 2-3 Arbitrator instances (queue-based)
  - 100+ agents per project
  - Multi-region deployment
```

### Resource Requirements

```
Development (Docker Compose):
  - RAM: 8 GB minimum, 16 GB recommended
  - CPU: 4 cores minimum, 8 cores recommended
  - Storage: 20 GB minimum, 50 GB recommended

Production (per instance):
  - Orchestrator: 2 GB RAM, 2 CPU cores
  - Arbitrator: 2 GB RAM, 2 CPU cores
  - PostgreSQL: 4 GB RAM, 2 CPU cores
  - Redis: 2 GB RAM, 1 CPU core
  - Ollama: 8 GB RAM (16 GB with GPU), 4 CPU cores
```

## Technology Stack Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Node.js 20+ | Application server |
| Framework | Express.js | Web framework |
| Database | PostgreSQL 15+ | Persistent storage |
| Cache | Redis 7+ | Context bus & state |
| LLM | Ollama + Gemini + Claude | AI inference |
| Container | Docker | Deployment |
| API Docs | Swagger/OpenAPI | Documentation |
| Monitoring | Prometheus | Metrics |
| Real-time | Socket.IO | WebSocket |
| Auth | JWT + Bcrypt | Authentication |
| Logging | Winston | Application logs |
| Security | Helmet.js | HTTP security |
| Rate Limit | express-rate-limit | API protection |

## Performance Metrics

### Target SLAs

```
┌──────────────────────────────────────────┐
│       Service Level Agreements           │
├──────────────────────────────────────────┤
│  API Response Time:                      │
│  • P50: < 100ms                          │
│  • P95: < 500ms                          │
│  • P99: < 1s                             │
├──────────────────────────────────────────┤
│  Project Execution:                      │
│  • Small (1-3 story points): 5-8 min    │
│  • Medium (5-8 story points): 8-15 min  │
│  • Large (8-13 story points): 15-30 min │
├──────────────────────────────────────────┤
│  Availability:                           │
│  • Uptime: 99.9%                         │
│  • RTO: < 5 minutes                      │
│  • RPO: < 1 minute                       │
├──────────────────────────────────────────┤
│  Success Rates:                          │
│  • Stage completion: 97%                 │
│  • End-to-end: 95%                       │
│  • Conflict auto-resolution: 80-92%     │
└──────────────────────────────────────────┘
```

---

**Version:** 2.0.0  
**Last Updated:** January 2026  
**Status:** Production Ready
