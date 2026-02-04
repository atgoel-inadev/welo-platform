# Batch Service Documentation

## Overview
The Batch Service handles file allocation, task creation, and automatic task assignment with Kafka integration for event-driven communication.

## Features

### 1. Batch Management
- Create batches for projects
- Update batch configurations
- Track batch statistics and completion

### 2. File Allocation
- Allocate individual files to create tasks
- Support for multiple file types: CSV, TXT, IMAGE, VIDEO, AUDIO, PDF
- Automatic task creation with workflow initialization
- Auto-assignment support

### 3. Task Assignment Algorithms

#### Round-Robin Assignment
Distributes tasks evenly among eligible users based on their current assignment count.

```typescript
// Usage
await batchService.allocateFiles(batchId, {
  files: [...],
  assignmentMethod: 'AUTO_ROUND_ROBIN',
  autoAssign: true
});
```

#### Workload-Based Assignment
Assigns tasks to users with the minimum active workload.

```typescript
// Usage
await batchService.allocateFiles(batchId, {
  files: [...],
  assignmentMethod: 'AUTO_WORKLOAD_BASED',
  autoAssign: true
});
```

#### Skill-Based Assignment
(Placeholder for future implementation)

### 4. Manual Task Assignment
- Ops manager can manually assign tasks to specific users
- Support for pull-based task retrieval (users pull next available task)

### 5. Kafka Integration
All batch and task events are published to Kafka for event-driven architecture:

#### Published Events
- `batch.created` - When a batch is created
- `batch.updated` - When batch is modified
- `batch.completed` - When all tasks in batch are complete
- `task.created` - When tasks are allocated from files
- `task.assigned` - When a task is assigned to a user
- `assignment.created` - When an assignment is created
- `notification.send` - Notifications to users about assignments

## API Endpoints

### Batch Operations

#### Create Batch
```http
POST /api/v1/batches
Content-Type: application/json

{
  "projectId": "uuid",
  "name": "Batch 001",
  "description": "First batch of annotations",
  "priority": 5,
  "dueDate": "2026-03-01T00:00:00Z",
  "configuration": {
    "assignmentRules": {},
    "validationRules": {},
    "exportSettings": {}
  }
}
```

#### Update Batch
```http
PATCH /api/v1/batches/:id
Content-Type: application/json

{
  "name": "Updated Batch Name",
  "priority": 8
}
```

#### Get Batch Statistics
```http
GET /api/v1/batches/:id/statistics

Response:
{
  "batchId": "uuid",
  "totalTasks": 100,
  "completedTasks": 45,
  "inProgressTasks": 20,
  "queuedTasks": 30,
  "failedTasks": 5,
  "completionPercentage": 45.0,
  "averageTaskDuration": 320,
  "qualityScore": 87.5,
  "assignmentBreakdown": {
    "manual": 15,
    "autoAssigned": 50,
    "unassigned": 35
  }
}
```

#### Complete Batch
```http
POST /api/v1/batches/:id/complete
```

### File Allocation

#### Allocate Files
```http
POST /api/v1/batches/:id/allocate-files
Content-Type: application/json

{
  "files": [
    {
      "externalId": "file-001",
      "fileType": "CSV",
      "fileUrl": "s3://bucket/file-001.csv",
      "fileName": "data-001.csv",
      "fileSize": 1024000,
      "metadata": {
        "columns": ["text", "label"],
        "rows": 5000
      }
    },
    {
      "externalId": "file-002",
      "fileType": "IMAGE",
      "fileUrl": "s3://bucket/image-002.jpg",
      "fileName": "image-002.jpg",
      "fileSize": 2048000
    }
  ],
  "taskType": "ANNOTATION",
  "priority": 7,
  "dueDate": "2026-03-15T00:00:00Z",
  "assignmentMethod": "AUTO_ROUND_ROBIN",
  "autoAssign": true
}
```

### Task Assignment

#### Manual Task Assignment
```http
POST /api/v1/batches/assign-task
Content-Type: application/json

{
  "taskId": "uuid",
  "userId": "uuid",
  "workflowStage": "ANNOTATION",
  "expiresIn": 28800
}
```

#### Auto-Assignment (No User Specified)
```http
POST /api/v1/batches/assign-task
Content-Type: application/json

{
  "taskId": "uuid"
}
```

#### Pull Next Task
```http
POST /api/v1/batches/pull-next-task
Content-Type: application/json

{
  "userId": "uuid",
  "taskType": "ANNOTATION"
}

Response:
{
  "id": "uuid",
  "externalId": "file-001",
  "taskType": "ANNOTATION",
  "status": "ASSIGNED",
  "priority": 7,
  "fileType": "CSV",
  "fileUrl": "s3://bucket/file-001.csv",
  "fileMetadata": {...},
  "batch": {...},
  "project": {...}
}
```

## Kafka Events

### Event Structure
All events follow this structure:
```json
{
  "id": "event-uuid",
  "eventType": "batch.created",
  "timestamp": "2026-02-03T10:30:00Z",
  "data": {
    // Entity data
  }
}
```

### Batch Events

#### batch.created
Published when a batch is created.
```json
{
  "id": "batch-uuid",
  "eventType": "batch.created",
  "timestamp": "2026-02-03T10:30:00Z",
  "data": {
    "id": "batch-uuid",
    "projectId": "project-uuid",
    "name": "Batch 001",
    "status": "CREATED",
    "totalTasks": 0,
    "completedTasks": 0
  }
}
```

#### batch.completed
Published when all tasks in a batch are complete.

### Task Events

#### task.created
Published for each task created during file allocation.
```json
{
  "id": "task-uuid",
  "eventType": "task.created",
  "timestamp": "2026-02-03T10:30:00Z",
  "data": {
    "id": "task-uuid",
    "batchId": "batch-uuid",
    "projectId": "project-uuid",
    "externalId": "file-001",
    "taskType": "ANNOTATION",
    "status": "QUEUED",
    "fileType": "CSV",
    "fileUrl": "s3://bucket/file-001.csv"
  }
}
```

#### task.assigned
Published when a task is assigned to a user.

### Assignment Events

#### assignment.created
Published when an assignment is created.
```json
{
  "id": "assignment-uuid",
  "eventType": "assignment.created",
  "timestamp": "2026-02-03T10:30:00Z",
  "data": {
    "id": "assignment-uuid",
    "taskId": "task-uuid",
    "userId": "user-uuid",
    "workflowStage": "ANNOTATION",
    "status": "ASSIGNED",
    "assignedAt": "2026-02-03T10:30:00Z",
    "expiresAt": "2026-02-03T18:30:00Z",
    "assignmentMethod": "AUTOMATIC",
    "assignmentOrder": 1
  }
}
```

### Notification Events

#### notification.send
Published to notify users about task assignments.
```json
{
  "id": "notification-uuid",
  "eventType": "notification.send",
  "timestamp": "2026-02-03T10:30:00Z",
  "data": {
    "userId": "user-uuid",
    "type": "TASK_ASSIGNED",
    "title": "New Task Assigned",
    "message": "You have been assigned a new task: file-001",
    "metadata": {
      "taskId": "task-uuid",
      "batchId": "batch-uuid",
      "projectId": "project-uuid"
    }
  }
}
```

## Consuming Events

Other services can consume these events:

### Notification Service
Consumes `notification.send` events to send notifications to users via email, SMS, or push notifications.

### Analytics Service
Consumes all events for metrics aggregation and reporting:
- `batch.created`, `batch.completed` - Track batch lifecycle
- `task.created`, `task.assigned` - Track task creation and assignment rates
- `assignment.created` - Track user workload and assignment patterns

### Workflow Engine Service
Consumes task events to manage state transitions:
- `task.created` - Initialize XState machine
- `task.assigned` - Transition to assigned state

## Assignment Algorithm Details

### Round-Robin Implementation
1. Query current assignment counts for all eligible users
2. Select user with minimum assignment count
3. Assign task to selected user
4. Update assignment counts

### Workload-Based Implementation
1. Query active assignments (ASSIGNED, IN_PROGRESS) for all users
2. Calculate current workload (number of active assignments)
3. Select user with minimum workload
4. Assign task to selected user

### Eligibility Criteria
Users are eligible for auto-assignment if:
- They have role ANNOTATOR or REVIEWER
- Their status is ACTIVE
- They are members of the project (future implementation)

## Environment Variables

```env
# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=project-management-service

# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=welo

# Redis Configuration (if needed for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Example Workflow

### 1. Create Project
```bash
curl -X POST http://localhost:3004/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Image Annotation Project",
    "customerId": "customer-uuid",
    "projectType": "IMAGE"
  }'
```

### 2. Create Batch
```bash
curl -X POST http://localhost:3004/api/v1/batches \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "project-uuid",
    "name": "Batch 001",
    "priority": 5
  }'
```

### 3. Allocate Files with Auto-Assignment
```bash
curl -X POST http://localhost:3004/api/v1/batches/batch-uuid/allocate-files \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {
        "externalId": "image-001",
        "fileType": "IMAGE",
        "fileUrl": "s3://bucket/image-001.jpg",
        "fileName": "image-001.jpg"
      }
    ],
    "assignmentMethod": "AUTO_ROUND_ROBIN",
    "autoAssign": true
  }'
```

### 4. User Pulls Next Task
```bash
curl -X POST http://localhost:3004/api/v1/batches/pull-next-task \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid"
  }'
```

### 5. Check Batch Statistics
```bash
curl -X GET http://localhost:3004/api/v1/batches/batch-uuid/statistics
```

## Integration with Other Services

### Task Management Service
- Can consume `task.created` events to sync tasks
- Can publish `task.completed` events back

### Notification Service
- Consumes `notification.send` events
- Sends notifications via configured channels

### Workflow Engine Service
- Consumes task events for state management
- Publishes state transition events

## Future Enhancements

1. **Skill-Based Assignment**
   - Match tasks with user skills and proficiency
   - Consider historical performance

2. **Load Balancing**
   - Consider user capacity limits
   - Time-based load distribution

3. **Priority Queuing**
   - High-priority tasks assigned first
   - SLA-based assignment

4. **Folder Allocation**
   - Scan cloud storage folders
   - Bulk file discovery and task creation

5. **Assignment Expiration Handling**
   - Automatic reassignment of expired tasks
   - Kafka events for expired assignments

## Monitoring

Key metrics to monitor:
- Task creation rate
- Assignment rate (manual vs auto)
- Average assignment time
- Task completion rate
- User workload distribution
- Kafka event lag
- Failed event deliveries

## Troubleshooting

### Tasks Not Being Auto-Assigned
- Check if users are ACTIVE and have ANNOTATOR/REVIEWER role
- Verify Kafka connection
- Check assignment algorithm selection

### Kafka Events Not Publishing
- Verify Kafka brokers are running
- Check KAFKA_BROKERS environment variable
- Review Kafka service logs

### Uneven Task Distribution
- Review assignment algorithm selection
- Check user eligibility criteria
- Monitor assignment counts per user
