# Workflow Progression Debugging Script
# Tests task submission and displays detailed workflow logs

$ErrorActionPreference = "Continue"

Write-Host "`n========== WORKFLOW PROGRESSION DEBUG ==========" -ForegroundColor Cyan

# Find a task that has assignments
Write-Host "`n[Step 1] Checking API endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3003/api/v1/tasks?projectId=850e8400-e29b-41d4-a716-446655440001&status=ASSIGNED"
    Write-Host "  API is responding ✓" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Task API not responding. Is task-management service running?" -ForegroundColor Red
    Write-Host "  Start with: npm run start:task-management" -ForegroundColor Gray
}

Write-Host "`n[Step 2] Checking project workflow configuration..." -ForegroundColor Yellow
try {
    $project = Invoke-RestMethod -Uri "http://localhost:3004/api/v1/projects/850e8400-e29b-41d4-a716-446655440001"
    $workflowConfig = $project.configuration.workflowConfiguration

    if ($workflowConfig -and $workflowConfig.stages) {
        Write-Host "  Workflow stages configured:" -ForegroundColor Green
        $workflowConfig.stages | ForEach-Object {
            $requiredCount = if ($_.type -eq 'annotation') { $_.annotators_count } else { $_.reviewers_count }
            Write-Host "    $($_.order). $($_.name) ($($_.type)) - Requires $requiredCount users" -ForegroundColor White
        }
    } else {
        Write-Host "  [ERROR] No workflow stages configured!" -ForegroundColor Red
    }
} catch {
    Write-Host "  [ERROR] Project API not responding" -ForegroundColor Red
}

Write-Host "`n[Step 3] Checking task machine state..." -ForegroundColor Yellow
Write-Host "  Run this SQL to check a task's currentStage:" -ForegroundColor Cyan
Write-Host "  docker exec welo-postgres psql -U postgres -d welo_platform -c \"SELECT id, status, machine_state->'context'->>'currentStage' as stage FROM tasks LIMIT 3;\"" -ForegroundColor Gray

Write-Host "`n[Step 4] Instructions to test workflow progression:" -ForegroundColor Yellow
Write-Host "  1. Login to UI as an annotator" -ForegroundColor White
Write-Host "  2. Open an assigned task" -ForegroundColor White
Write-Host "  3. Complete the annotation" -ForegroundColor White
Write-Host "  4. Click 'Submit'" -ForegroundColor White
Write-Host "  5. Watch the task-management service terminal for logs like:" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "     ========== WORKFLOW PROGRESSION START ==========" -ForegroundColor Green
Write-Host "     [Step 1] Loading task..." -ForegroundColor Green
Write-Host "     [Step 2] Task found. Status: SUBMITTED..." -ForegroundColor Green
Write-Host "     [Step 3] Workflow config loaded. Stages: Annotation → Review" -ForegroundColor Green
Write-Host "     [Step 4] Machine state currentStage: stage_annotation" -ForegroundColor Green
Write-Host "     [Step 5] Current stage found: Annotation..." -ForegroundColor Green
Write-Host "     [Step 6] Checking assignments for stage 'Annotation'..." -ForegroundColor Green
Write-Host "     [Step 7] Assignment Status Check:" -ForegroundColor Green
Write-Host "              Required: 1 annotators" -ForegroundColor Green
Write-Host "              Found: 1 total assignments" -ForegroundColor Green
Write-Host "              Completed: 1" -ForegroundColor Green
Write-Host "     [SUCCESS] All 1 assignment(s) completed! Ready to progress..." -ForegroundColor Green
Write-Host "     [Step 8] Progressing to next stage: Review" -ForegroundColor Green
Write-Host "" -ForegroundColor White

Write-Host "`n[Step 5] Common issues and fixes:" -ForegroundColor Yellow
Write-Host "  Issue 1: '[FAILED] Task has no currentStage in machineState'" -ForegroundColor Red
Write-Host "  Fix: Run backfill script to initialize currentStage" -ForegroundColor White
Write-Host "    Get-Content add-workflow-config.sql | docker exec -i welo-postgres psql -U postgres -d welo_platform" -ForegroundColor Gray
Write-Host ""
Write-Host "  Issue 2: '[WAIT] Task NOT ready to progress. Still need X more assignment(s)'" -ForegroundColor Red
Write-Host "  Fix: This is expected! Multi-annotator tasks need ALL annotators to complete before progressing" -ForegroundColor White
Write-Host "    - Check how many annotators required: annotators_count in workflow config" -ForegroundColor Gray
Write-Host "    - Check how many completed: Count of COMPLETED assignments for this task" -ForegroundColor Gray
Write-Host ""
Write-Host "  Issue 3: No logs appear at all" -ForegroundColor Red
Write-Host "  Fix: Check if progressWorkflowAfterSubmission is being called" -ForegroundColor White
Write-Host "    - Look for '[Workflow Trigger] Starting workflow progression' log" -ForegroundColor Gray
Write-Host "    - If missing, the async call might be silently failing" -ForegroundColor Gray

Write-Host "`n[Step 6] Database queries for debugging:" -ForegroundColor Yellow
Write-Host "  Query task current stage (replace YOUR_TASK_ID):" -ForegroundColor White
Write-Host "    docker exec welo-postgres psql -U postgres -d welo_platform" -ForegroundColor Gray
Write-Host ""
Write-Host "  Query all assignments for a task:" -ForegroundColor White  
Write-Host "    docker exec welo-postgres psql -U postgres -d welo_platform" -ForegroundColor Gray
Write-Host ""
Write-Host "  Query project team members:" -ForegroundColor White
Write-Host "    docker exec welo-postgres psql -U postgres -d welo_platform" -ForegroundColor Gray

Write-Host "`n========== TEST READY - Submit a task and watch logs! ==========" -ForegroundColor Cyan
Write-Host "Task management service should be running on: http://localhost:3003" -ForegroundColor White
Write-Host "Watch the terminal where npm run start:task-management is running" -ForegroundColor White
