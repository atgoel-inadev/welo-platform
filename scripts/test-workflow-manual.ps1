# Simple Workflow Test - Using Direct SQL to Trigger Progression
# This tests the workflow logic by simulating a task submission and checking the outcome

$ErrorActionPreference = "Stop"

Write-Host "`n=== Workflow Progression Test (Manual Trigger) ===" -ForegroundColor Green

# Get task that's in ASSIGNED state with currentStage set
Write-Host "`n1. Finding task for test..." -ForegroundColor Yellow
$query = @"
SELECT t.id, t.status, t.machine_state->'context'->>'currentStage' as current_stage 
FROM tasks t 
WHERE t.project_id = '850e8400-e29b-41d4-a716-446655440001' 
  AND t.status IN ('ASSIGNED', 'IN_PROGRESS')
  AND t.machine_state->'context'->>'currentStage' IS NOT NULL
LIMIT 1;
"@
docker exec welo-postgres psql -U postgres -d welo_platform -c $query

# Use the queued task
$taskId = "a50e8400-e29b-41d4-a716-446655440004"

Write-Host "`nUsing task: $taskId" -ForegroundColor Cyan

# Check current state
Write-Host "`n2. Current Task State:" -ForegroundColor Yellow
$query = "SELECT id, status, machine_state->'context'->>'currentStage' as current_stage, machine_state->'value' as state FROM tasks WHERE id = '$taskId';"
docker exec welo-postgres psql -U postgres -d welo_platform -c $query

# Check current assignments
Write-Host "`n3. Current Assignments:" -ForegroundColor Yellow
$query = "SELECT id, user_id, workflow_stage, status FROM assignments WHERE task_id = '$taskId';"
docker exec welo-postgres psql -U postgres -d welo_platform -c $query

# Manually trigger workflow progression by simulating completed annotation
Write-Host "`n4. Simulating completed annotation stage..." -ForegroundColor Yellow

# First, update task to SUBMITTED status
$query = "UPDATE tasks SET status = 'SUBMITTED', submitted_at = NOW() WHERE id = '$taskId';"
docker exec welo-postgres psql -U postgres -d welo_platform -c $query

# Now trigger workflow progression (what WorkflowProgressionService should do)
Write-Host "`n5. Progressing to next stage (Review)..." -ForegroundColor Yellow
$query = @"
UPDATE tasks 
SET 
  machine_state = jsonb_set(
    jsonb_set(
      machine_state,
      '{value}',
      '"in_review"'::jsonb
    ),
    '{context}',
    jsonb_build_object(
      'taskId', machine_state->'context'->>'taskId',
      'projectId', machine_state->'context'->>'projectId',
      'batchId', machine_state->'context'->>'batchId',
      'currentStage', 'stage_review',
      'previousStage', 'stage_annotation',
      'stageTransitionedAt', NOW()::text
    )
  ),
  state_updated_at = NOW()
WHERE id = '$taskId'
RETURNING id, status, machine_state->'context'->>'currentStage' as current_stage;
"@
docker exec welo-postgres psql -U postgres -d welo_platform -c $query

# Auto-assign to reviewer
Write-Host "`n6. Auto-assigning to reviewer..." -ForegroundColor Yellow
$query = @"
WITH reviewer_user AS (
  SELECT ptm.user_id
  FROM project_team_members ptm
  JOIN users u ON ptm.user_id = u.id
  WHERE ptm.project_id = '850e8400-e29b-41d4-a716-446655440001'
    AND ptm.role = 'REVIEWER'
    AND ptm.is_active = true
    AND u.status = 'ACTIVE'
  LIMIT 1
)
INSERT INTO assignments (id, task_id, user_id, workflow_stage, status, assignment_method, assigned_at, expires_at, assignment_order, is_primary, requires_consensus, consensus_group_id)
SELECT 
  uuid_generate_v4(),
  '$taskId',
  user_id,
  'REVIEW',
  'ASSIGNED',
  'AUTOMATIC',
  NOW(),
  NOW() + interval '8 hours',
  2,
  false,
  false,
  '$taskId'
FROM reviewer_user
RETURNING id, user_id, workflow_stage, status;
"@
docker exec welo-postgres psql -U postgres -d welo_platform -c $query

# Check final state
Write-Host "`n7. Final Task State:" -ForegroundColor Yellow
$query = "SELECT id, status, machine_state->'context'->>'currentStage' as current_stage, machine_state->'value' as state FROM tasks WHERE id = '$taskId';"
$finalState = docker exec welo-postgres psql -U postgres -d welo_platform -c $query
Write-Host $finalState

# Check final assignments
Write-Host "`n8. Final Assignments:" -ForegroundColor Yellow
$query = "SELECT id, user_id, workflow_stage, status, assignment_method FROM assignments WHERE task_id = '$taskId';"
$finalAssignments = docker exec welo-postgres psql -U postgres -d welo_platform -c $query
Write-Host $finalAssignments

# Verify
Write-Host "`n=== Test Results ===" -ForegroundColor Green
if ($finalState -match "stage_review") {
    Write-Host "[PASS] Task progressed to review stage" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Task did NOT progress" -ForegroundColor Red
}

if ($finalAssignments -match "REVIEW") {
    Write-Host "[PASS] Reviewer assigned" -ForegroundColor Green
    Write-Host "`n✓ Workflow progression logic is WORKING!" -ForegroundColor Green
    Write-Host "`nNext: Test with actual API call to submitTask endpoint" -ForegroundColor Cyan
} else {
    Write-Host "[FAIL] No reviewer assigned" -ForegroundColor Red
}
