# Contributing to Zekka Framework

Thank you for your interest in contributing to Zekka Framework! This guide will help you get started with contributing to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Development Workflow](#development-workflow)
5. [Coding Standards](#coding-standards)
6. [Testing Guidelines](#testing-guidelines)
7. [Pull Request Process](#pull-request-process)
8. [Issue Guidelines](#issue-guidelines)
9. [Documentation](#documentation)
10. [Community](#community)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors. We pledge to:

- Be respectful and considerate
- Welcome diverse perspectives and experiences
- Focus on what is best for the community
- Show empathy towards other community members

### Expected Behavior

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **Docker** and Docker Compose
- **Git** for version control
- Basic knowledge of:
  - JavaScript/Node.js
  - Express.js
  - PostgreSQL
  - Redis
  - Docker

### Types of Contributions

We welcome various types of contributions:

1. **Bug Fixes** - Fix issues in the codebase
2. **Features** - Add new functionality
3. **Documentation** - Improve or add documentation
4. **Tests** - Add or improve test coverage
5. **Performance** - Optimize existing code
6. **Security** - Fix security vulnerabilities
7. **Refactoring** - Improve code quality

---

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/Zekka.git
cd Zekka

# Add upstream remote
git remote add upstream https://github.com/zekka-tech/Zekka.git
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

Required environment variables:
```bash
# GitHub Integration (REQUIRED)
GITHUB_TOKEN=ghp_your_token_here

# AI Models (Optional)
ANTHROPIC_API_KEY=sk-ant-your_key_here
OPENAI_API_KEY=sk-your_key_here

# Database
DATABASE_URL=postgresql://zekka:zekka_password_2024@localhost:5432/zekka

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Ollama
OLLAMA_HOST=http://localhost:11434

# JWT
JWT_SECRET=your-secure-secret-key-change-in-production
JWT_EXPIRATION=24h

# Budget
DAILY_BUDGET=50
MONTHLY_BUDGET=1000
```

### 4. Start Development Environment

```bash
# Start all services with Docker Compose
docker-compose up -d

# Verify all services are running
docker-compose ps

# Check logs
docker-compose logs -f
```

### 5. Verify Setup

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test API docs
open http://localhost:3000/api/docs

# Test Prometheus metrics
curl http://localhost:3000/metrics
```

---

## Development Workflow

### Branch Strategy

We follow Git Flow:

- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes
- `docs/*` - Documentation updates

### Creating a Feature Branch

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Create a new feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b bugfix/issue-number-description
```

### Making Changes

1. **Write Code**
   ```bash
   # Make your changes
   # Add new files if needed
   ```

2. **Run Tests**
   ```bash
   npm test
   ```

3. **Lint Code**
   ```bash
   npm run lint
   
   # Fix linting issues automatically
   npm run lint -- --fix
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples:**
```bash
feat(orchestrator): add support for custom workflow stages

fix(auth): resolve JWT token expiration issue

docs(api): update API reference with new endpoints

test(agents): add unit tests for agent coordination
```

---

## Coding Standards

### JavaScript Style Guide

We use ESLint with the following configuration:

```javascript
// .eslintrc.json
{
  "env": {
    "node": true,
    "es2021": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 12
  },
  "rules": {
    "indent": ["error", 2],
    "linebreak-style": ["error", "unix"],
    "quotes": ["error", "single"],
    "semi": ["error", "always"],
    "no-console": "off",
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
}
```

### Code Organization

```
src/
├── index.js              # Main application entry
├── swagger.js            # OpenAPI specification
├── orchestrator/         # Orchestration logic
│   └── orchestrator.js
├── arbitrator/           # Conflict resolution
│   └── server.js
├── shared/               # Shared utilities
│   ├── context-bus.js
│   └── token-economics.js
├── middleware/           # Express middleware
│   ├── auth.js
│   ├── rateLimit.js
│   ├── metrics.js
│   └── websocket.js
└── routes/               # API routes (future)
    └── *.js
```

### Best Practices

1. **Modularity**
   - Keep functions small and focused
   - Use clear, descriptive names
   - Follow single responsibility principle

2. **Error Handling**
   ```javascript
   try {
     // Your code
   } catch (error) {
     logger.error('Error description:', error);
     throw new Error('User-friendly error message');
   }
   ```

3. **Async/Await**
   ```javascript
   // Good
   async function fetchData() {
     try {
       const result = await database.query();
       return result;
     } catch (error) {
       logger.error('Database error:', error);
       throw error;
     }
   }
   
   // Avoid
   function fetchData() {
     return database.query()
       .then(result => result)
       .catch(error => { throw error; });
   }
   ```

4. **Documentation**
   ```javascript
   /**
    * Create a new project in the orchestrator
    * @param {Object} options - Project configuration
    * @param {string} options.name - Project name
    * @param {Array<string>} options.requirements - Project requirements
    * @param {number} options.storyPoints - Agile story points
    * @returns {Promise<Object>} Created project object
    */
   async function createProject(options) {
     // Implementation
   }
   ```

---

## Testing Guidelines

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/orchestrator/orchestrator.test.js

# Run with coverage
npm test -- --coverage

# Watch mode (during development)
npm test -- --watch
```

### Writing Tests

We use Jest for testing. Example:

```javascript
// src/orchestrator/orchestrator.test.js
const ZekkaOrchestrator = require('./orchestrator');

describe('ZekkaOrchestrator', () => {
  let orchestrator;
  
  beforeEach(() => {
    orchestrator = new ZekkaOrchestrator({
      contextBus: mockContextBus,
      tokenEconomics: mockTokenEconomics,
      logger: mockLogger,
      config: mockConfig
    });
  });
  
  describe('createProject', () => {
    it('should create a project with valid input', async () => {
      const project = await orchestrator.createProject({
        name: 'Test Project',
        requirements: ['Requirement 1', 'Requirement 2'],
        storyPoints: 8
      });
      
      expect(project).toHaveProperty('projectId');
      expect(project.name).toBe('Test Project');
      expect(project.status).toBe('pending');
    });
    
    it('should throw error with invalid input', async () => {
      await expect(
        orchestrator.createProject({})
      ).rejects.toThrow('Missing required fields');
    });
  });
});
```

### Test Coverage Goals

- **Unit Tests:** 80% minimum coverage
- **Integration Tests:** Critical paths covered
- **E2E Tests:** Main user workflows covered

---

## Pull Request Process

### Before Submitting

1. **Update Your Branch**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run All Checks**
   ```bash
   npm test
   npm run lint
   ```

3. **Update Documentation**
   - Update relevant docs if your changes affect them
   - Add JSDoc comments to new functions
   - Update API_REFERENCE.md if API changed

### Submitting Pull Request

1. **Push Your Branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request**
   - Go to GitHub repository
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests passing
```

### Review Process

1. **Automated Checks**
   - CI/CD pipeline runs tests
   - Linting checks
   - Build verification

2. **Code Review**
   - At least one maintainer approval required
   - Address review comments
   - Request re-review after changes

3. **Merge**
   - Squash and merge (default)
   - Delete branch after merge

---

## Issue Guidelines

### Creating Issues

Use issue templates for:

- **Bug Report**
- **Feature Request**
- **Documentation Improvement**
- **Performance Issue**
- **Security Vulnerability**

### Bug Report Template

```markdown
**Description**
Clear description of the bug

**Steps to Reproduce**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g., Ubuntu 22.04]
- Node.js: [e.g., 20.10.0]
- Docker: [e.g., 24.0.7]

**Logs**
Relevant log output

**Screenshots**
If applicable
```

### Feature Request Template

```markdown
**Problem Statement**
What problem does this feature solve?

**Proposed Solution**
How should this feature work?

**Alternatives Considered**
Other approaches considered

**Additional Context**
Any other relevant information
```

---

## Documentation

### Types of Documentation

1. **Code Comments**
   - JSDoc for functions and classes
   - Inline comments for complex logic

2. **API Documentation**
   - Update API_REFERENCE.md
   - Update Swagger spec in src/swagger.js

3. **Architecture Documentation**
   - Update ARCHITECTURE.md for system changes
   - Add diagrams if helpful

4. **User Documentation**
   - Update README.md for user-facing changes
   - Update setup guides if needed

### Documentation Standards

- **Clear and Concise:** Use simple language
- **Examples:** Provide code examples
- **Up-to-Date:** Keep docs synchronized with code
- **Formatted:** Use proper Markdown formatting

---

## Community

### Getting Help

- **GitHub Issues:** Report bugs or request features
- **Discussions:** Ask questions or share ideas
- **Discord:** Real-time chat (coming soon)
- **Email:** support@zekka.tech

### Recognition

Contributors are recognized in:

- README.md contributors section
- CHANGELOG.md release notes
- GitHub contributors page

---

## Development Tips

### Debugging

```bash
# Enable debug logs
LOG_LEVEL=debug npm run dev

# Debug with Node.js inspector
node --inspect src/index.js

# Docker container logs
docker-compose logs -f orchestrator
docker-compose logs -f arbitrator
```

### Performance Testing

```bash
# Load test with Apache Bench
ab -n 1000 -c 10 http://localhost:3000/health

# Monitor metrics
watch -n 1 'curl -s http://localhost:3000/metrics | grep zekka'
```

### Database Management

```bash
# PostgreSQL console
docker-compose exec postgres psql -U zekka -d zekka

# Redis console
docker-compose exec redis redis-cli

# View Ollama models
docker-compose exec ollama ollama list
```

---

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR:** Breaking changes
- **MINOR:** New features (backward compatible)
- **PATCH:** Bug fixes

### Release Checklist

1. Update version in package.json
2. Update CHANGELOG.md
3. Run full test suite
4. Create release branch
5. Tag release
6. Merge to main
7. Deploy to production
8. Create GitHub release
9. Announce release

---

## Questions?

If you have questions about contributing:

1. Check existing issues and documentation
2. Open a discussion on GitHub
3. Contact maintainers

Thank you for contributing to Zekka Framework! 🚀

---

**Version:** 2.0.0  
**Last Updated:** January 2026  
**Maintainers:** Zekka Tech Team
