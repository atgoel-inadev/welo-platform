# Workflow Progression Implementation - Complete

## Issues Identified and Fixed

### 1. ✅ Project Missing Workflow Configuration  
**Problem:** Project didn't have `workflowConfiguration.stages` defined.  
**Fix:** Added annotation → review workflow stages to project configuration.

```sql
-- Applied via add-workflow-config.sql
{
  "stages": [
    {
      "id": "stage_annotation",
      "name": "Annotation", 
      "type": "annotation",
      "auto_assign": true,
      "annotators_count": 1,
      "order": 1
    },
    {
      "id": "stage_review",
      "name": "Review",
      "type": "review",
      "auto_assign": true,
      "reviewers_count": 1,
      "order": 2
    }
  ]
}
```

### 2. ✅ Tasks Missing `currentStage` in Machine State
**Problem:** Tasks created without `machine_state.context.currentStage`, causing WorkflowProgressionService to exit early.  
**Fix:** 
- Backfilled all existing tasks with `currentStage = "stage_annotation"`
- Updated batch.service.ts to initialize `currentStage` when tasks are first assigned

### 3. ✅ Circular Dependency in WorkflowProgressionService
**Problem:** StageAssignmentService was passed as `null`, causing auto-assignment to fail.  
**Fix:** Removed dependency on StageAssignmentService and implemented direct assignment creation in WorkflowProgressionService.

## Files Modified

### Backend Services

1. **apps/project-management/src/services/batch.service.ts**
   - Added machine state initialization when tasks are assigned
   - Sets `currentStage` to first workflow stage

2. **apps/task-management/src/services/workflow-progression.service.ts**
   - Removed StageAssignmentService dependency
   - Implemented direct assignment creation in `autoAssignToStage()`
   - Fixed assignment order calculation

3. **apps/task-management/src/task/task.service.ts**
   - Removed StageAssignmentService import
   - Simplified `progressWorkflowAfterSubmission()`

### Database Changes

1. **add-workflow-config.sql** - Added workflow stages to project
2. **backfill-task-machine-state.sql** - Set currentStage for existing tasks

## How It Works

```
1. Task Creation
   └─> status: QUEUED, machine_state.context.currentStage: null

2. Task Assignment (batch.service.ts)
   └─> status: ASSIGNED
   └─> machine_state.context.currentStage: "stage_annotation"

3. Task Submission (task.service.ts submitTask())
   └─> status: SUBMITTED
   └─> Calls progressWorkflowAfterSubmission() async

4. Workflow Progression (workflow-progression.service.ts)
   ├─> Checks if annotation stage complete (all assignments COMPLETED)
   ├─> Gets next stage from config (stage_review)
   ├─> Updates machine_state.context.currentStage: "stage_review"
   ├─> Updates machine_state.value: "in_review"
   └─> Auto-assigns to eligible reviewers

5. Final State
   └─> status: SUBMITTED
   └─> machine_state.context.currentStage: "stage_review"
   └─> New assignment created with workflow_stage: REVIEW
```

## Verification Steps

### Check Current State

```powershell
# Check task that was submitted
docker exec  welo-postgres psql -U postgres -d welo_platform -c "SELECT id, status, machine_state->'context'->>'currentStage' as current_stage FROM tasks WHERE id = 'a50e8400-e29b-41d4-a716-446655440002';"
```

**Expected:** currentStage should be "stage_review" after submission

### Manually Trigger Workflow Progression (SQL Test)

```sql
-- Run this to simulate what WorkflowProgressionService does
UPDATE tasks 
SET 
  machine_state = jsonb_set(
    jsonb_set(
      machine_state,
      '{value}',
      '"in_review"'::jsonb
    ),
    '{context,currentStage}',
    '"stage_review"'::jsonb
  ),
  machine_state = jsonb_set(
    machine_state,
    '{context,previousStage}',
    '"stage_annotation"'::jsonb
  ),
  machine_state = jsonb_set(
    machine_state,
    '{context,stageTransitionedAt}',
    to_jsonb(NOW()::text)
  )
WHERE id = 'a50e8400-e29b-41d4-a716-446655440002';

-- Auto-assign to reviewer
WITH reviewer_user AS (
  SELECT u.id as user_id
  FROM project_team_members ptm
  JOIN users u ON ptm.user_id = u.id
  WHERE ptm.project_id = '850e8400-e29b-41d4-a716-446655440001'
    AND ptm.role = 'REVIEWER'
    AND ptm.is_active = true
    AND u.status = 'ACTIVE'
  LIMIT 1
)
INSERT INTO assignments (
  id, task_id, user_id, workflow_stage, status, assignment_method,
  assigned_at, expires_at, assignment_order, is_primary, requires_consensus, consensus_group_id
)
SELECT 
  uuid_generate_v4(),
  'a50e8400-e29b-41d4-a716-446655440002',
  user_id,
  'REVIEW',
  'ASSIGNED',
  'AUTOMATIC',
  NOW(),
  NOW() + interval '8 hours',
  2,
  false,
  false,
  'a50e8400-e29b-41d4-a716-446655440002'
FROM reviewer_user
RETURNING id, user_id, workflow_stage;
```

### Verify Results

```sql
-- Check task state
SELECT id, status, 
  machine_state->'context'->>'currentStage' as current_stage,
  machine_state->'value' as state_value
FROM tasks 
WHERE id = 'a50e8400-e29b-41d4-a716-446655440002';

-- Check assignments
SELECT id, user_id, workflow_stage, status, assignment_method
FROM assignments 
WHERE task_id = 'a50e8400-e29b-41d4-a716-446655440002'
ORDER BY created_at;
```

**Expected Results:**
- Task currentStage: `stage_review`
- Task state_value: `"in_review"`
- Two assignments: one ANNOTATION (COMPLETED), one REVIEW (ASSIGNED)

## Testing with UI

### 1. Create New Batch with Tasks
- **Project:** Sentiment Analysis Dataset
- **Auto-allocate** tasks to annotators

### 2. Submit Task as Annotator
- Login as annotator (annotator1@welo.com / password123)
- Open assigned task
- Complete annotation
- Click Submit

### 3. Verify Workflow Progression
- Task should automatically move to review stage
- Reviewer should be auto-assigned
- Check in database or batch details UI

## Logs to Monitor

When a task is submitted, you should see these log messages in task-management service:

```
[TaskService] Task a50e8400... submitted by assignment c50e8400...
[WorkflowProgressionService] Task a50e8400... progressed from stage 'Annotation' to 'Review'
[WorkflowProgressionService] Auto-assigned task a50e8400... to user 650e8400... for stage Review
[TaskService] Task a50e8400... workflow progression completed
```

## Architecture Compliance Note

Per Microservices Architecture.md, this implementation should eventually be refactored:

**Current (Interim):** WorkflowProgressionService in task-management service
**Target (Architecture):**
- Workflow Engine Service: Owns state transitions, publishes `state.transitioned` event
- Task Management Service: Consumes `state.transitioned`, handles auto-assignment

**Migration Path:**
1. ✅ Phase 1: Get workflow progression working (current implementation)
2. Phase 2: Extract workflow logic to workflow-engine service
3. Phase 3: Implement Kafka event-driven communication
4. Phase 4: Task-management consumes events for assignment

## Summary

✅ **Workflow configuration added** to project  
✅ **Machine state initialized** for all tasks  
✅ **Circular dependency resolved** in WorkflowProgressionService  
✅ **Auto-assignment implemented** for review stage  
✅ **Database schema validated** and backfilled  

**Status:** Ready for testing! Submit a task via UI and verify reviewer assignment.
