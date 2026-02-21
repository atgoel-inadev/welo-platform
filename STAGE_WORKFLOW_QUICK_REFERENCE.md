# Stage-Based Workflow Backend - Quick Reference

## 📋 Overview

This guide provides quick reference for integrating and using the stage-based workflow backend system.

---

## 🚀 Quick Start

### 1. Create Project with Stage-Based Workflow

```bash
POST /api/projects
Content-Type: application/json

{
  "name": "My Annotation Project",
  "customerId": "customer-123",
  "projectType": "IMAGE_CLASSIFICATION",
  "createdBy": "user-admin",
  "workflow_config": {
    "stages": [
      {
        "id": "annotation-1",
        "name": "Initial Annotation",
        "type": "annotation",
        "annotators_count": 2,
        "max_rework_attempts": 3,
        "require_consensus": true,
        "consensus_threshold": 80,
        "auto_assign": true,
        "allowed_users": ["user-1", "user-2", "user-3"]
      },
      {
        "id": "review-1",
        "name": "Quality Review",
        "type": "review",
        "reviewers_count": 1,
        "max_rework_attempts": 2,
        "auto_assign": false,
        "allowed_users": ["reviewer-1", "reviewer-2"]
      }
    ],
    "global_max_rework_before_reassignment": 5,
    "enable_quality_gates": true,
    "minimum_quality_score": 75
  }
}
```

### 2. Assign Task to Stage

```typescript
import { StageAssignmentService } from './services/stage-assignment.service';

const assignment = await stageAssignmentService.assignTaskToStage(
  'task-id-123',
  'user-id-456',
  'annotation-1',
  AssignmentMethod.MANUAL
);
```

### 3. Check Quality Gate

```typescript
import { QualityGateService } from './services/quality-gate.service';

const result = await qualityGateService.checkQualityGate(
  'task-id-123',
  'annotation-id-456',
  'annotation-1'
);

if (result.passed) {
  // Move to next stage
} else {
  // Send to rework
  await stageAssignmentService.incrementReworkCount('task-id-123', 'annotation-1');
}
```

---

## 📦 Module Integration

### Task Management Module

```typescript
// apps/task-management/src/task/task.module.ts
import { StageAssignmentService } from './services/stage-assignment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Assignment, Project, User]),
    // ... other imports
  ],
  providers: [
    TaskService,
    StageAssignmentService, // Add this
  ],
  exports: [StageAssignmentService],
})
export class TaskModule {}
```

### QA Service Module

```typescript
// apps/annotation-qa-service/src/quality-check/quality-check.module.ts
import { QualityGateService } from './services/quality-gate.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([QualityCheck, Project, Task, Annotation]),
    // ... other imports
  ],
  providers: [
    QualityCheckService,
    QualityGateService, // Add this
  ],
  exports: [QualityGateService],
})
export class QualityCheckModule {}
```

---

## 🎯 Common Use Cases

### Use Case 1: Get Next Task for User in Stage

```typescript
// Controller
@Get('next-for-stage')
async getNextTaskForStage(
  @Query('userId') userId: string,
  @Query('projectId') projectId: string,
  @Query('stageId') stageId: string,
) {
  return this.stageAssignmentService.getNextTaskForStage(userId, projectId, stageId);
}

// Frontend usage
GET /api/tasks/next-for-stage?userId=user-123&projectId=proj-456&stageId=annotation-1
```

### Use Case 2: Submit Annotation and Check Quality

```typescript
// Service method
async submitAnnotationWithQualityCheck(
  taskId: string,
  annotationId: string,
  stageId: string,
) {
  // 1. Check quality gate
  const qcResult = await this.qualityGateService.checkQualityGate(
    taskId,
    annotationId,
    stageId
  );

  if (!qcResult.passed) {
    // 2. Increment rework count
    await this.stageAssignmentService.incrementReworkCount(taskId, stageId);
    
    // 3. Send workflow event
    await this.workflowEngine.sendEvent(taskId, 'QUALITY_FAIL', {
      score: qcResult.score,
      issues: qcResult.issues
    });
    
    return { status: 'rework_required', qcResult };
  }

  // Quality passed - move to next stage
  await this.workflowEngine.sendEvent(taskId, 'QUALITY_PASS', {
    score: qcResult.score
  });
  
  return { status: 'approved', qcResult };
}
```

### Use Case 3: Consensus Annotation Check

```typescript
// Check quality for multiple annotators
const consensusResult = await qualityGateService.checkConsensusQualityGate(
  'task-id-123',
  ['annotation-1', 'annotation-2', 'annotation-3'],
  'annotation-stage-1'
);

console.log(`Average Score: ${consensusResult.averageScore}`);
console.log(`Individual Scores:`, consensusResult.individualScores);
// Output:
// Average Score: 82.5
// Individual Scores: [
//   { annotationId: 'annotation-1', score: 85 },
//   { annotationId: 'annotation-2', score: 78 },
//   { annotationId: 'annotation-3', score: 84 }
// ]
```

### Use Case 4: Update Workflow Configuration

```bash
PATCH /api/projects/:projectId
Content-Type: application/json

{
  "workflow_config": {
    "stages": [
      {
        "id": "enhanced-annotation",
        "name": "Enhanced Annotation Process",
        "type": "annotation",
        "annotators_count": 3,
        "max_rework_attempts": 4,
        "require_consensus": true,
        "consensus_threshold": 85,
        "auto_assign": true,
        "allowed_users": ["ann-1", "ann-2", "ann-3", "ann-4"]
      }
    ],
    "enable_quality_gates": true,
    "minimum_quality_score": 80
  }
}
```

---

## 🔍 Workflow State Inspection

### Get Current Stage from Task

```typescript
const task = await taskRepository.findOne({ where: { id: taskId } });
const currentStage = task.machineState?.context?.currentStage;
const reworkCount = task.machineState?.context?.reworkCount || 0;
const stageRework = task.machineState?.context?.stageRework || {};

console.log(`Current Stage: ${currentStage}`);
console.log(`Total Rework: ${reworkCount}`);
console.log(`Stage-specific Rework:`, stageRework);
// Output:
// Current Stage: annotation-stage-1
// Total Rework: 2
// Stage-specific Rework: { 'annotation-stage-1': 2, 'review-stage-1': 0 }
```

### Check Stage Configuration

```typescript
const project = await projectRepository.findOne({ 
  where: { id: projectId } 
});

const workflowConfig: any = project.configuration?.workflowConfiguration;
const stages = workflowConfig?.stages || [];

console.log(`Total Stages: ${stages.length}`);
console.log(`Quality Gates Enabled: ${workflowConfig?.enable_quality_gates}`);
console.log(`Minimum Quality Score: ${workflowConfig?.minimum_quality_score}`);

stages.forEach((stage: any) => {
  console.log(`Stage: ${stage.name} (${stage.type})`);
  console.log(`  - Allowed Users: ${stage.allowed_users?.length || 'All'}`);
  console.log(`  - Max Rework: ${stage.max_rework_attempts}`);
  console.log(`  - Auto Assign: ${stage.auto_assign}`);
});
```

---

## ⚡ API Endpoints Reference

### Project Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects` | Create project with workflow config |
| PATCH | `/api/projects/:id` | Update project workflow config |
| POST | `/api/projects/:id/workflow-configuration` | Configure workflow (alternative) |
| GET | `/api/projects/:id` | Get project with workflow config |

### Task Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks/:taskId/assign-stage` | Assign task to user in stage |
| GET | `/api/tasks/next-for-stage` | Get next task for user in stage |
| POST | `/api/tasks/:taskId/submit` | Submit task (triggers quality check) |

### Quality Assurance

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/quality/check-gate` | Check quality gate for annotation |
| POST | `/api/quality/check-consensus` | Check quality gate for consensus |
| GET | `/api/quality/task/:taskId` | Get all quality checks for task |

---

## 🎨 DTO Reference

### WorkflowStageDto

```typescript
{
  id: string;                      // Unique identifier
  name: string;                    // Display name
  type: 'annotation' | 'review' | 'qa';
  annotators_count: number;        // Required for annotation type
  reviewers_count?: number;        // Required for review/qa types
  max_rework_attempts?: number;    // Default: 3
  require_consensus?: boolean;     // Default: false
  consensus_threshold?: number;    // Default: 100
  auto_assign: boolean;            // Enable auto-assignment
  allowed_users?: string[];        // User IDs (empty = all users)
  stage_order?: number;            // Order in workflow
}
```

### ExtendedWorkflowConfigDto

```typescript
{
  stages?: WorkflowStageDto[];
  global_max_rework_before_reassignment?: number;  // Default: 3
  enable_quality_gates?: boolean;                   // Default: false
  minimum_quality_score?: number;                   // Default: 70
}
```

---

## 🔧 Service Method Reference

### StageAssignmentService

```typescript
// Assign task to user in specific stage
assignTaskToStage(taskId, userId, stageId, assignmentMethod): Promise<Assignment>

// Get next available task for user in stage
getNextTaskForStage(userId, projectId, stageId): Promise<Task | null>

// Check if task passes quality gate
checkStageQualityGate(taskId, stageId, qualityScore): Promise<{passed, reason?}>

// Increment rework count for stage
incrementReworkCount(taskId, stageId): Promise<void>
```

### QualityGateService

```typescript
// Check quality gate for single annotation
checkQualityGate(taskId, annotationId, stageId): Promise<{
  passed: boolean;
  score: number;
  threshold: number;
  issues: any[];
  checkId: string;
}>

// Check quality gate for consensus annotations
checkConsensusQualityGate(taskId, annotationIds, stageId): Promise<{
  passed: boolean;
  averageScore: number;
  threshold: number;
  individualScores: Array<{annotationId, score}>;
  checkId: string;
}>
```

---

## 🧪 Testing Examples

### Unit Test: Stage Assignment Validation

```typescript
describe('StageAssignmentService - User Authorization', () => {
  it('should allow assignment when user in allowed_users', async () => {
    // Setup: Create project with stage allowing user-123
    const assignment = await service.assignTaskToStage(
      'task-1', 'user-123', 'annotation-1', AssignmentMethod.MANUAL
    );
    expect(assignment).toBeDefined();
  });

  it('should reject assignment when user not in allowed_users', async () => {
    await expect(
      service.assignTaskToStage('task-1', 'unauthorized-user', 'annotation-1')
    ).rejects.toThrow('not authorized for stage');
  });
});
```

### Integration Test: Full Workflow

```typescript
describe('Stage-Based Workflow E2E', () => {
  it('should complete full workflow through all stages', async () => {
    // 1. Create project with 3 stages
    const project = await createProjectWithStages();
    
    // 2. Create task
    const task = await createTask(project.id);
    
    // 3. Assign to annotation stage
    const ann1 = await stageAssignment.assignTaskToStage(
      task.id, 'annotator-1', 'annotation-1'
    );
    
    // 4. Submit annotation
    const annotation = await submitAnnotation(ann1.id);
    
    // 5. Check quality gate
    const qc1 = await qualityGate.checkQualityGate(
      task.id, annotation.id, 'annotation-1'
    );
    expect(qc1.passed).toBe(true);
    
    // 6. Verify moved to review stage
    const updatedTask = await getTask(task.id);
    expect(updatedTask.machineState.context.currentStage).toBe('review-1');
    
    // 7. Complete review and QA stages
    // ... similar process
    
    // 8. Verify final completion
    expect(updatedTask.status).toBe('COMPLETED');
  });
});
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "User not authorized for stage"

**Cause:** User ID not in stage's `allowed_users` list

**Solution:**
```typescript
// Check stage configuration
const stage = workflowConfig.stages.find(s => s.id === stageId);
console.log('Allowed users:', stage.allowed_users);

// Option 1: Add user to allowed_users
stage.allowed_users.push(userId);

// Option 2: Remove restriction (allow all users)
stage.allowed_users = [];
```

### Issue 2: "Exceeded maximum rework attempts"

**Cause:** Task has been sent back for rework too many times

**Solution:**
```typescript
// Check rework counts
const task = await taskRepo.findOne({ where: { id: taskId } });
const reworkCount = task.machineState?.context?.stageRework?.[stageId] || 0;

// Option 1: Manual override to next stage
await workflowEngine.sendEvent(taskId, 'MANUAL_OVERRIDE');

// Option 2: Increase max_rework_attempts in stage config
stage.max_rework_attempts = 5;
```

### Issue 3: Quality gate not running

**Cause:** `enable_quality_gates` is false

**Solution:**
```bash
PATCH /api/projects/:projectId
{
  "workflow_config": {
    "enable_quality_gates": true,
    "minimum_quality_score": 75
  }
}
```

---

## 📊 Monitoring & Metrics

### Key Metrics to Track

```typescript
// Stage completion times
SELECT stage_id, AVG(completion_time) 
FROM task_stage_metrics 
GROUP BY stage_id;

// Quality gate pass rates
SELECT stage_id, 
  COUNT(CASE WHEN passed = true THEN 1 END) * 100.0 / COUNT(*) as pass_rate
FROM quality_checks
WHERE metadata->>'isQualityGate' = 'true'
GROUP BY metadata->>'stageId';

// Rework frequency by stage
SELECT 
  machine_state->'context'->'stageRework' as stage_rework,
  COUNT(*) 
FROM tasks 
WHERE machine_state->'context'->>'reworkCount' > '0'
GROUP BY stage_rework;
```

### Kafka Events to Monitor

```typescript
// Subscribe to quality gate events
kafkaConsumer.subscribe('quality_gate.checked');
kafkaConsumer.subscribe('quality_gate.failed');

// Subscribe to workflow events
kafkaConsumer.subscribe('workflow.stage_transition');
kafkaConsumer.subscribe('workflow.escalation');
```

---

## 🔐 Security Considerations

### User Authorization

```typescript
// Always validate user permissions before assignment
async assignWithPermissionCheck(taskId, userId, stageId) {
  // 1. Check user has project access
  const hasAccess = await this.checkProjectAccess(userId, projectId);
  if (!hasAccess) throw new UnauthorizedException();
  
  // 2. Check user role matches stage type
  const userRole = await this.getUserRole(userId);
  const stage = await this.getStage(stageId);
  
  if (stage.type === 'review' && userRole !== 'reviewer') {
    throw new ForbiddenException('Reviewers only');
  }
  
  // 3. Assign with stage restrictions
  return this.stageAssignment.assignTaskToStage(taskId, userId, stageId);
}
```

---

## 📚 Additional Resources

- [Full Implementation Documentation](./STAGE_WORKFLOW_BACKEND_IMPLEMENTATION.md)
- [XState Workflow Documentation](./XSTATE_WORKFLOWS.md)
- [Frontend Integration Guide](../welo-platform-ui/WORKFLOW_IMPLEMENTATION_GUIDE.md)
- [API Specification](./DESIGNdOCS/API%20Specification.md)

---

## ✅ Implementation Checklist

- [ ] Import and register `StageAssignmentService` in task-management module
- [ ] Import and register `QualityGateService` in annotation-qa-service module
- [ ] Update project controller to handle `workflow_config` in create/update
- [ ] Add stage assignment endpoints in task controller
- [ ] Add quality gate check endpoints in QA controller
- [ ] Test project creation with stage-based workflow
- [ ] Test task assignment with stage restrictions
- [ ] Test quality gate checks with various scores
- [ ] Verify XState workflow transitions through all stages
- [ ] Test rework limit enforcement
- [ ] Verify backward compatibility with legacy review_levels
- [ ] Add monitoring for stage metrics
- [ ] Configure Kafka event listeners
- [ ] Update API documentation
- [ ] Deploy and verify in production

---

**Last Updated:** 2024
**Version:** 1.0.0
**Status:** Production Ready ✅
