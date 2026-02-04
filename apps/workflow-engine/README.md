# Workflow Engine Service

XState-based workflow engine for the Welo Data Annotation Platform.

## Features

- ✅ XState v5 state machine management
- ✅ Workflow CRUD operations
- ✅ Event-driven state transitions
- ✅ Workflow instance (actor) management
- ✅ State transition audit trail
- ✅ Redis caching for performance
- ✅ PostgreSQL for persistence
- ✅ Swagger/OpenAPI documentation
- ✅ Health monitoring

## API Endpoints

### Workflows
- `GET /api/v1/workflows` - List workflows
- `POST /api/v1/workflows` - Create workflow
- `GET /api/v1/workflows/:id` - Get workflow
- `PATCH /api/v1/workflows/:id` - Update workflow
- `DELETE /api/v1/workflows/:id` - Delete workflow
- `POST /api/v1/workflows/:id/validate` - Validate workflow
- `POST /api/v1/workflows/:id/simulate` - Simulate workflow
- `GET /api/v1/workflows/:id/visualization` - Get visualization

### Events & State Management
- `POST /api/v1/tasks/:taskId/events` - Send event to task
- `GET /api/v1/tasks/:taskId/state` - Get current state
- `GET /api/v1/tasks/:taskId/state-history` - Get state history
- `POST /api/v1/tasks/:taskId/state/restore` - Restore to previous state
- `GET /api/v1/tasks/:taskId/transitions` - Get possible transitions
- `POST /api/v1/events/batch` - Batch send events

### Workflow Instances
- `POST /api/v1/workflow-instances` - Create instance
- `GET /api/v1/workflow-instances/:id` - Get instance
- `POST /api/v1/workflow-instances/:id/events` - Send event
- `POST /api/v1/workflow-instances/:id/pause` - Pause instance
- `POST /api/v1/workflow-instances/:id/resume` - Resume instance
- `POST /api/v1/workflow-instances/:id/stop` - Stop instance
- `GET /api/v1/workflow-instances/:id/snapshot` - Get snapshot
- `POST /api/v1/workflow-instances/:id/restore` - Restore from snapshot
- `GET /api/v1/workflow-instances/:id/actors` - Get child actors

### State Transitions
- `GET /api/v1/state-transitions/:id` - Get transition details
- `GET /api/v1/state-transitions` - Query transitions

### Health
- `GET /api/v1/health` - Health check
- `GET /api/v1/health/status` - Detailed status

## Setup

### Prerequisites
- Node.js >= 18
- PostgreSQL >= 14
- Redis >= 7

### Installation
```bash
# From monorepo root
npm install
```

### Configuration
Copy `.env.example` to `.env` and configure:
```bash
PORT=3001
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=workflow_engine
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Database Setup
```bash
# Create database
createdb workflow_engine

# Run migrations (auto on first start in dev mode)
npm run start:workflow-engine
```

### Running
```bash
# Development mode
npm run start:workflow-engine

# Production mode
npm run build
npm run start:prod
```

## XState Integration

### Creating a Workflow

```typescript
const workflowDefinition = {
  id: 'annotationWorkflow',
  initial: 'queued',
  context: {
    taskId: null,
    assignedTo: null,
    attempts: 0
  },
  states: {
    queued: {
      on: {
        ASSIGN: {
          target: 'assigned',
          actions: ['assignToUser']
        }
      }
    },
    assigned: {
      on: {
        START: 'inProgress',
        EXPIRE: 'queued'
      },
      after: {
        ASSIGNMENT_TIMEOUT: 'queued'
      }
    },
    inProgress: {
      on: {
        SUBMIT: {
          target: 'review',
          actions: ['saveAnnotation']
        }
      }
    },
    review: {
      invoke: {
        src: 'performQualityCheck',
        onDone: {
          target: 'approved',
          cond: 'qualityPassed'
        },
        onError: 'inProgress'
      }
    },
    approved: {
      type: 'final'
    }
  }
};

// POST /api/v1/workflows
const response = await fetch('http://localhost:3001/api/v1/workflows', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Annotation Workflow',
    xstateDefinition: workflowDefinition
  })
});
```

### Sending Events

```typescript
// Send event to transition state
const response = await fetch('http://localhost:3001/api/v1/tasks/task-uuid/events?workflowId=workflow-uuid', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'SUBMIT',
    payload: {
      annotationData: { /* ... */ }
    }
  })
});

const result = await response.json();
console.log('New state:', result.data.currentState.value);
```

### Managing Workflow Instances

```typescript
// Create workflow instance for a batch
const instance = await fetch('http://localhost:3001/api/v1/workflow-instances', {
  method: 'POST',
  body: JSON.stringify({
    workflowId: 'workflow-uuid',
    batchId: 'batch-uuid',
    initialContext: {
      totalTasks: 500,
      priority: 8
    }
  })
});

// Pause instance
await fetch(`http://localhost:3001/api/v1/workflow-instances/${instance.id}/pause`, {
  method: 'POST'
});

// Resume instance
await fetch(`http://localhost:3001/api/v1/workflow-instances/${instance.id}/resume`, {
  method: 'POST'
});
```

## Architecture

```
┌─────────────────────────────────────────────┐
│          Workflow Engine Service            │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐  ┌──────────────┐        │
│  │   Workflow   │  │    Event     │        │
│  │   Module     │  │   Module     │        │
│  └──────────────┘  └──────────────┘        │
│                                             │
│  ┌──────────────┐  ┌──────────────┐        │
│  │   Instance   │  │  Transition  │        │
│  │   Module     │  │   Module     │        │
│  └──────────────┘  └──────────────┘        │
│                                             │
│         ↓                 ↓                 │
│  ┌──────────────┐  ┌──────────────┐        │
│  │  PostgreSQL  │  │    Redis     │        │
│  │  (Entities)  │  │   (Cache)    │        │
│  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────┘
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Monitoring

- Health endpoint: `GET /api/v1/health`
- Swagger docs: `http://localhost:3001/api`
- Metrics: (TODO: Prometheus integration)

## Performance Considerations

- Workflow definitions are cached in Redis
- Compiled XState machines are cached
- Active actor states stored in Redis
- State transitions partitioned by date
- Database connection pooling enabled

## License

UNLICENSED
