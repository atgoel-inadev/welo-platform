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

## Documentation

API documentation available at:
- Workflow Engine: http://localhost:3001/api
- Auth Service: http://localhost:3002/api
- Task Management: http://localhost:3003/api
