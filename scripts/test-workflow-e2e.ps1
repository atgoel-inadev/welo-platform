# End-to-End Workflow Progression Test
# Tests the full cycle: Task Assignment → Annotation → Workflow Progression → Reviewer Assignment

$ErrorActionPreference = "Stop"

Write-Host "`n=== End-to-End Workflow Progression Test ===" -ForegroundColor Green

# Get a task that's assigned to an annotator
Write-Host "`n1. Finding an assigned task..." -ForegroundColor Yellow
$query = "SELECT t.id as task_id, a.id as assignment_id, a.user_id FROM tasks t JOIN assignments a ON t.id = a.task_id WHERE t.status = 'ASSIGNED' AND a.status = 'ASSIGNED' AND a.workflow_stage = 'ANNOTATION' LIMIT 1;"
$taskInfo = docker exec welo-postgres psql -U postgres -d welo_platform -c $query -t | Select-Object -First 1

if (-not $taskInfo) {
    Write-Host "[ERROR] No assigned tasks found. Please assign a task first." -ForegroundColor Red
    exit 1
}

$parts = ($taskInfo.ToString() -split '\|').Trim()
$taskId = $parts[0].Trim()
$assignmentId = $parts[1].Trim()
$userId = $parts[2].Trim()

Write-Host "  Task ID: $taskId" -ForegroundColor Cyan
Write-Host "  Assignment ID: $assignmentId" -ForegroundColor Cyan
Write-Host "  User ID: $userId" -ForegroundColor Cyan

# Get user token (use hardcoded test account since email from DB has whitespace issues)
Write-Host "`n2. Using test annotator account..." -ForegroundColor Yellow
$userEmail = "annotator1@welo.com"
Write-Host "  User Email: '$userEmail'" -ForegroundColor Cyan

# Login to get token
Write-Host "`n3. Logging in as annotator..." -ForegroundColor Yellow
$loginBody = @{
    email = $userEmail
    password = "password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/v1/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json"
    
    $token = $loginResponse.token
    Write-Host "  [PASS] Login successful" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Login failed: $_" -ForegroundColor Red
    exit 1
}

# Check task state BEFORE submission
Write-Host "`n4. Task State BEFORE submission:" -ForegroundColor Yellow
$query = "SELECT id, status, machine_state->'context'->>'currentStage' as current_stage, machine_state->'value' as state_value FROM tasks WHERE id = '$taskId';"
docker exec welo-postgres psql -U postgres -d welo_platform -c $query

# Check assignments BEFORE submission
Write-Host "`n5. Assignments BEFORE submission:" -ForegroundColor Yellow
$query = "SELECT id, user_id, workflow_stage, status FROM assignments WHERE task_id = '$taskId' ORDER BY created_at;"
docker exec welo-postgres psql -U postgres -d welo_platform -c $query

# Submit the task
Write-Host "`n6. Submitting task..." -ForegroundColor Yellow
$submitBody = @{
    taskId = $taskId
    assignmentId = $assignmentId
    annotationData = @{
        sentiment = "positive"
        confidence = 0.95
    }
    responses = @(
        @{
            questionId = "q1"
            response = @{ value = "positive" }
        },
        @{
            questionId = "q2"
            response = @{ value = 5 }
        }
    )
    confidenceScore = 0.95
    timeSpent = 120
} | ConvertTo-Json -Depth 5

try {
    $submitResponse = Invoke-RestMethod -Uri "http://localhost:3003/api/v1/tasks/$taskId/submit" `
        -Method Post `
        -Headers @{Authorization="Bearer $token"} `
        -Body $submitBody `
        -ContentType "application/json"
    
    Write-Host "  [PASS] Task submitted successfully" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Task submission failed: $_" -ForegroundColor Red
    Write-Host "  Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

# Wait for async workflow progression
Write-Host "`n7. Waiting for workflow progression (3 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Check task state AFTER submission
Write-Host "`n8. Task State AFTER submission:" -ForegroundColor Yellow
$query = "SELECT id, status, machine_state->'context'->>'currentStage' as current_stage, machine_state->'value' as state_value FROM tasks WHERE id = '$taskId';"
$taskState = docker exec welo-postgres psql -U postgres -d welo_platform -c $query
Write-Host $taskState

# Check if currentStage changed to review
if ($taskState -match "stage_review") {
    Write-Host "  [PASS] Task progressed to review stage" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Task did NOT progress to review stage" -ForegroundColor Red
}

# Check assignments AFTER submission
Write-Host "`n9. Assignments AFTER submission:" -ForegroundColor Yellow
$query = "SELECT id, user_id, workflow_stage, status, assignment_method FROM assignments WHERE task_id = '$taskId' ORDER BY created_at;"
$assignments = docker exec welo-postgres psql -U postgres -d welo_platform -c $query
Write-Host $assignments

# Check if reviewer was assigned
if ($assignments -match "REVIEWER") {
    Write-Host "  [PASS] Reviewer assignment created" -ForegroundColor Green
    $reviewerAssigned = $true
} else {
    Write-Host "  [FAIL] No reviewer assignment found" -ForegroundColor Red
    $reviewerAssigned = $false
}

# Summary
Write-Host "`n=== Test Results ===" -ForegroundColor Green
Write-Host "[PASS] Task submission" -ForegroundColor Green

if ($taskState -match "stage_review") {
    Write-Host "[PASS] Workflow progression (annotation → review)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Workflow progression did NOT occur" -ForegroundColor Red
}

if ($reviewerAssigned) {
    Write-Host "[PASS] Reviewer auto-assignment" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Reviewer was NOT auto-assigned" -ForegroundColor Red
}

Write-Host "`nWorkflow progression is " -NoNewline
if ($taskState -match "stage_review" -and $reviewerAssigned) {
    Write-Host "WORKING!" -ForegroundColor Green
} else {
    Write-Host "NOT WORKING" -ForegroundColor Red
    Write-Host "`nCheck task-management service logs for errors:" -ForegroundColor Yellow
    Write-Host "  Look for 'progressWorkflowAfterSubmission' or 'WorkflowProgressionService' messages" -ForegroundColor White
}
