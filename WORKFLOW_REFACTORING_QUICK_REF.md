# Workflow Refactoring - Quick Reference

## Architecture Overview

```
┌─────────────────────────┐         ┌──────────────────────────┐
│  Task Management        │         │  Workflow Engine         │
│  (Port 3003)            │         │  (Port 3001)             │
├─────────────────────────┤         ├──────────────────────────┤
│                         │         │                          │
│  POST /tasks/:id/       │         │  WorkflowEventHandler    │
│       annotation        │         │    ↓ subscribes          │
│         ↓               │         │  annotation.submitted    │
│  saveAnnotation()       │         │    ↓                     │
│         ↓               │         │  StateTransitionService  │
│  publishAnnotationEvent()│────────→│  processAnnotationSubmitted()
│                         │         │    ↓                     │
│                         │         │  progressToNextStage()   │
│                         │         │    ↓                     │
│                         │ ←───────│  publishStateTransitioned()
│         ↓               │         │                          │
│  TaskAssignmentEventHandler        └──────────────────────────┘
│    ↓                    │
│  autoAssignToStage()    │
│    ↓                    │
│  Create Assignments     │
│    ↓                    │
│  Publish task.assigned  │
└─────────────────────────┘
```

## Event Flow

### 1. Annotation Submission (UI → Task Management)
```http
POST http://localhost:3003/api/v1/tasks/{taskId}/annotation
Content-Type: application/json

{
  "responses": [
    { "questionId": "q1", "response": "answer1" }
  ],
  "extraWidgetData": {},
  "timeSpent": 300
}
```

### 2. Kafka Event: `annotation.submitted`
```json
{
  "id": "annotation-uuid",
  "taskId": "task-uuid",
  "userId": "user-uuid",
  "version": 1,
  "responsesCount": 5,
  "timestamp": "2026-03-06T10:30:00Z"
}
```

### 3. Kafka Event: `state.transitioned`
```json
{
  "taskId": "task-uuid",
  "projectId": "project-uuid",
  "batchId": "batch-uuid",
  "fromStage": {
    "id": "stage_annotation",
    "name": "Annotation",
    "type": "annotation"
  },
  "toStage": {
    "id": "stage_review",
    "name": "Review",
    "type": "review",
    "autoAssign": true,
    "requiredUsers": 1
  },
  "isCompleted": false,
  "machineState": { ... },
  "timestamp": "2026-03-06T10:30:01Z"
}
```

### 4. Assignment Creation (Task Management)
- New `Assignment` record created
- `task.assigned` event published
- `notification.send` event published

## Key Files

### Workflow Engine
```
apps/workflow-engine/src/
├── app.module.ts                    (✅ Modified: Added KafkaModule)
└── state-transition/
    ├── state-transition.module.ts   (✅ New)
    ├── state-transition.service.ts  (✅ New: State transition logic)
    └── workflow-event.handler.ts    (✅ New: Event subscriber)
```

### Task Management
```
apps/task-management/src/
├── app.module.ts                           (✅ Modified: Added state.transitioned topic)
├── task/task.service.ts                    (✅ Modified: Publishes annotation.submitted)
└── services/
    └── task-assignment-event.handler.ts   (✅ New: Handles assignments)
```

## Testing Commands

### 1. Rebuild Services
```bash
cd welo-platform

# Build only the modified services (NOT full down/up)
docker compose build workflow-engine
docker compose build task-management

# Restart services
docker compose up -d workflow-engine
docker compose up -d task-management
```

### 2. Watch Logs
```bash
# Workflow Engine
docker compose logs -f workflow-engine | grep "\[STATE TRANSITION\]\|\[Event Received\]\|\[Workflow Advanced\]"

# Task Management
docker compose logs -f task-management | grep "\[Annotation Submitted\]\|\[TASK ASSIGNMENT\]\|\[Assignment Created\]"
```

### 3. Test Annotation Submission

**Get auth token** (from login or use existing):
```bash
$token = "your-jwt-token"
$taskId = "your-task-id"
```

**Submit annotation**:
```powershell
$body = @{
  responses = @(
    @{ questionId = "q1"; response = "test answer" }
  )
  extraWidgetData = @{}
  timeSpent = 300
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3003/api/v1/tasks/$taskId/annotation" `
  -Method Post `
  -Headers @{ Authorization = "Bearer $token" } `
  -Body $body `
  -ContentType "application/json"
```

### 4. Verify Database Updates

**Check task state**:
```sql
SELECT 
  id, 
  status, 
  machine_state->'context'->>'currentStage' as current_stage,
  machine_state->'context'->>'previousStage' as previous_stage
FROM tasks 
WHERE id = 'task-uuid';
```

**Check assignments**:
```sql
SELECT 
  id, 
  user_id, 
  workflow_stage, 
  status,
  assignment_order
FROM assignments 
WHERE task_id = 'task-uuid' 
ORDER BY assignment_order;
```

## Expected Behavior

### Successful Flow
1. **Task Management receives annotation** → `200 OK`
2. **Workflow Engine processes event** → State transitioned log
3. **Task Management creates assignment** → New reviewer assigned
4. **Database updated** → Task status = SUBMITTED, new assignment created

### Logs Timeline
```
[10:30:00] [Task Management] Annotation Submitted Task abc123 by user def456 — annotation.submitted event published
[10:30:01] [Workflow Engine] Event Received annotation.submitted for task abc123
[10:30:01] [Workflow Engine] ========== STATE TRANSITION START ==========
[10:30:01] [Workflow Engine] [Workflow Advanced] Task abc123 transitioned from 'Annotation' to 'Review'
[10:30:01] [Workflow Engine] [Event Published] state.transitioned: Annotation → Review
[10:30:02] [Task Management] ========== TASK ASSIGNMENT START ==========
[10:30:02] [Task Management] [Event Received] state.transitioned for task abc123
[10:30:02] [Task Management] [Assignment Created] Task abc123 → User ghi789 (stage: Review)
[10:30:02] [Task Management] ========== TASK ASSIGNMENT END (SUCCESS) ==========
```

## Troubleshooting

### Events Not Firing

**Check Kafka health**:
```bash
docker compose ps kafka
docker compose logs kafka | tail -50
```

**Verify topics created**:
```bash
docker exec -it welo-kafka kafka-topics --list --bootstrap-server localhost:9092
# Should include: annotation.submitted, state.transitioned
```

### Service Not Subscribing

**Check KafkaModule registration**:
- Workflow Engine: Should have `annotation.submitted` in topics array
- Task Management: Should have `state.transitioned` in topics array

**Check logs for subscription confirmation**:
```bash
docker compose logs workflow-engine | grep "Event subscriptions initialized"
docker compose logs task-management | grep "Subscribed to state.transitioned"
```

### Assignment Not Created

**Check if auto_assign is true in project workflow config**:
```sql
SELECT 
  configuration->'workflowConfiguration'->'stages' as stages
FROM projects 
WHERE id = 'project-uuid';
```

**Check eligible users**:
```sql
SELECT u.id, u.name, ptm.role, ptm.is_active
FROM project_team_members ptm
JOIN users u ON ptm.user_id = u.id
WHERE ptm.project_id = 'project-uuid' 
  AND ptm.role = 'REVIEWER' 
  AND ptm.is_active = true 
  AND u.status = 'ACTIVE';
```

## Rollback Procedure

If issues arise during deployment:

```bash
# 1. Stop affected services
docker compose stop workflow-engine task-management

# 2. Check out previous commit
git log --oneline -5  # Find commit before refactoring
git checkout <previous-commit>

# 3. Rebuild and restart
docker compose build workflow-engine task-management
docker compose up -d workflow-engine task-management

# 4. Verify services healthy
docker compose ps
docker compose logs -f workflow-engine task-management
```

## Performance Metrics

Expected latency:
- Save annotation: ~50-100ms (unchanged)
- Event publish: ~5-10ms
- State transition: ~50-100ms (async)
- Assignment creation: ~50-100ms (async)

**Total user-visible latency**: ~50-100ms (same as before)  
**Background processing**: ~100-200ms (async, non-blocking)

## Contact / Support

- Architecture Doc: [Microservices Architecture.md](../../DESIGNdOCS/Microservices%20Architecture.md)
- Full Documentation: [WORKFLOW_REFACTORING_EVENT_DRIVEN.md](./WORKFLOW_REFACTORING_EVENT_DRIVEN.md)
- Slack Channel: #welo-platform-dev (if applicable)
