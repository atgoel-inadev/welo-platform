# Welo Platform Monorepo

Microservices architecture for the Welo Data Annotation Platform.

## Structure

```
welo-platform/
├── apps/                    # Microservices applications
│   ├── workflow-engine/    # XState-based workflow engine
│   ├── auth-service/       # Authentication & authorization
│   ├── task-management/    # Task, batch, queue management
│   └── ...                 # Other services
├── libs/                    # Shared libraries
│   └── common/             # Common utilities, DTOs, interfaces
└── package.json            # Root package.json
```

## Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 14.x
- Redis >= 7.x
- Kafka (optional, for event streaming)

## Installation

```bash
npm install
```

## Running Services

### Workflow Engine Service
```bash
npm run start:workflow-engine
```

### Auth Service
```bash
npm run start:auth-service
```

### Task Management Service
```bash
npm run start:task-management
```

## Development

```bash
# Start all services in watch mode
npm run start:dev

# Run tests
npm run test

# Run linter
npm run lint

# Format code
npm run format
```

## Environment Variables

Create `.env` files in each service directory:

### Workflow Engine (.env)
```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/workflow_engine
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
```

### Auth Service (.env)
```
PORT=3002
DATABASE_URL=postgresql://user:password@localhost:5432/auth_service
JWT_SECRET=your-secret-key
```

### Task Management (.env)
```
PORT=3003
DATABASE_URL=postgresql://user:password@localhost:5432/task_management
```

## Architecture

This monorepo uses:
- **NestJS** - Node.js framework
- **XState** - State machine library for workflow engine
- **TypeORM** - ORM for database management
- **Redis** - Caching and state storage
- **Kafka** - Event streaming (optional)

## Services

| Service | Port | Description |
|---------|------|-------------|
| Workflow Engine | 3001 | XState workflow management |
| Auth Service | 3002 | Authentication & authorization |
| Task Management | 3003 | Task, batch, queue operations |

## Development Workflow

**NEW:** Contract-first, backend-first development practices to reduce iteration cycles and improve code quality.

### Quick Start
1. 📖 **Read:** [WORKFLOW_CHEAT_SHEET.md](WORKFLOW_CHEAT_SHEET.md) - Quick reference for daily development
2. 📋 **Plan:** Copy [docs/FEATURE_PLAN_TEMPLATE.md](docs/FEATURE_PLAN_TEMPLATE.md) before starting features
3. 🧪 **Test:** Use [scripts/test-batch-task-apis.ps1](scripts/test-batch-task-apis.ps1) as testing template
4. 📚 **Learn:** [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md) - Comprehensive guide with examples

### Key Principles
- ✅ Define API contracts **before** coding
- ✅ Test backend with curl/PowerShell **before** frontend integration
- ✅ Use feature planning template for every feature
- ✅ Build only the service you changed
- ✅ One rebuild instead of six

**Time Savings:** 33-50% per feature (2 hours vs 3+ hours)

See [WORKFLOW_DOCUMENTATION_SUMMARY.md](WORKFLOW_DOCUMENTATION_SUMMARY.md) for complete overview.

## Documentation

API documentation available at:
- Workflow Engine: http://localhost:3001/api
- Auth Service: http://localhost:3002/api
- Task Management: http://localhost:3003/api
