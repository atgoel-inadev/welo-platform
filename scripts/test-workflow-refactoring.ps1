# Workflow Refactoring Test Plan
# Run this script to test the event-driven workflow refactoring

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Workflow Refactoring Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$projectId = "850e8400-e29b-41d4-a716-446655440001"
$batchId = "b50e8400-e29b-41d4-a716-446655440001"
$annotatorToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjI1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMSIsImVtYWlsIjoiYW5ub3RhdG9yMUBleGFtcGxlLmNvbSIsInJvbGUiOiJBTk5PVEFUT1IiLCJzdWIiOiIyNTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDEiLCJpYXQiOjE3MDk3MzAwMDAsImV4cCI6MTc0MTI2NjAwMH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

Write-Host "Step 1: Check Service Status" -ForegroundColor Yellow
Write-Host "-----------------------------"
$services = @("workflow-engine", "task-management", "kafka")
foreach ($service in $services) {
    $status = docker compose ps $service --format "{{.Status}}"
    if ($status -like "*Up*") {
        Write-Host "✅ $service is running" -ForegroundColor Green
    } else {
        Write-Host "❌ $service is not running" -ForegroundColor Red
        Write-Host "   Starting $service..." -ForegroundColor Yellow
        docker compose up -d $service
    }
}
Write-Host ""

Write-Host "Step 2: Verify Kafka Topics" -ForegroundColor Yellow
Write-Host "-----------------------------"
Write-Host "Checking for required topics..."
$topics = docker exec -it welo-kafka kafka-topics --list --bootstrap-server localhost:9092 2>$null
if ($topics -match "annotation.submitted") {
    Write-Host "✅ annotation.submitted topic exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  annotation.submitted topic not found" -ForegroundColor Yellow
}
if ($topics -match "state.transitioned") {
    Write-Host "✅ state.transitioned topic exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  state.transitioned topic not found" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Step 3: Get Available Task for Testing" -ForegroundColor Yellow
Write-Host "----------------------------------------"
Write-Host "Fetching tasks from batch $batchId..."
$query = @"
SELECT 
  t.id, 
  t.status, 
  t.machine_state->'context'->>'currentStage' as current_stage,
  COUNT(a.id) as assignment_count,
  COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED') as completed_count
FROM tasks t
LEFT JOIN assignments a ON t.id = a.task_id
WHERE t.batch_id = '$batchId'
  AND t.status IN ('ASSIGNED', 'IN_PROGRESS')
GROUP BY t.id
ORDER BY t.created_at
LIMIT 5;
"@

$result = docker exec welo-postgres psql -U postgres -d welo_platform -c $query -t 2>$null
Write-Host $result
Write-Host ""

Write-Host "Enter task ID to test (or press Enter to skip): " -NoNewline -ForegroundColor Cyan
$taskId = Read-Host
if ([string]::IsNullOrWhiteSpace($taskId)) {
    Write-Host "⚠️  Skipping task submission test" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Step 4: Check Current State" -ForegroundColor Yellow
Write-Host "-----------------------------"
$query = @"
SELECT 
  id, 
  status, 
  machine_state->'context'->>'currentStage' as current_stage,
  machine_state->'value' as state_value
FROM tasks 
WHERE id = '$taskId';
"@
Write-Host "Task state before submission:"
docker exec welo-postgres psql -U postgres -d welo_platform -c $query
Write-Host ""

$query = "SELECT id, user_id, workflow_stage, status FROM assignments WHERE task_id = '$taskId' ORDER BY assignment_order;"
Write-Host "Assignments before submission:"
docker exec welo-postgres psql -U postgres -d welo_platform -c $query
Write-Host ""

Write-Host "Step 5: Monitor Logs (Background)" -ForegroundColor Yellow
Write-Host "-----------------------------------"
Write-Host "Starting log monitoring in background..."
$logJob = Start-Job -ScriptBlock {
    param($taskId)
    docker compose logs -f --tail=0 workflow-engine task-management 2>&1 | 
        Select-String -Pattern "STATE TRANSITION|TASK ASSIGNMENT|Event Received|Workflow Advanced|Assignment Created|$taskId"
} -ArgumentList $taskId
Write-Host "✅ Log monitoring started (Job ID: $($logJob.Id))" -ForegroundColor Green
Start-Sleep -Seconds 2
Write-Host ""

Write-Host "Step 6: Submit Annotation" -ForegroundColor Yellow
Write-Host "--------------------------"
Write-Host "Submitting annotation for task $taskId..."

$body = @{
    responses = @(
        @{
            questionId = "q1"
            response = "Test annotation response for workflow refactoring test"
            timeSpent = 120
            confidenceScore = 0.95
        }
    )
    extraWidgetData = @{
        testRun = $true
        timestamp = (Get-Date -Format "o")
    }
    timeSpent = 120
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod `
        -Uri "http://localhost:3003/api/v1/tasks/$taskId/annotation" `
        -Method Post `
        -Headers @{ Authorization = "Bearer $annotatorToken" } `
        -Body $body `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "✅ Annotation submitted successfully!" -ForegroundColor Green
    Write-Host "   Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to submit annotation: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Stop-Job -Job $logJob
    Remove-Job -Job $logJob
    exit 1
}
Write-Host ""

Write-Host "Step 7: Wait for Event Processing" -ForegroundColor Yellow
Write-Host "-----------------------------------"
Write-Host "Waiting for Kafka events to propagate (5 seconds)..."
Start-Sleep -Seconds 5
Write-Host ""

Write-Host "Step 8: Capture Logs" -ForegroundColor Yellow
Write-Host "---------------------"
$logs = Receive-Job -Job $logJob
Stop-Job -Job $logJob
Remove-Job -Job $logJob

if ($logs) {
    Write-Host "Event Flow Logs:" -ForegroundColor Cyan
    $logs | ForEach-Object {
        if ($_ -match "STATE TRANSITION") {
            Write-Host "  $($_)" -ForegroundColor Magenta
        } elseif ($_ -match "TASK ASSIGNMENT") {
            Write-Host "  $($_)" -ForegroundColor Blue
        } elseif ($_ -match "Event Received") {
            Write-Host "  $($_)" -ForegroundColor Yellow
        } elseif ($_ -match "Workflow Advanced|Assignment Created") {
            Write-Host "  $($_)" -ForegroundColor Green
        } else {
            Write-Host "  $($_)" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "⚠️  No logs captured. Events may have processed too quickly." -ForegroundColor Yellow
    Write-Host "   Checking service logs manually..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Workflow Engine Logs:" -ForegroundColor Cyan
    docker compose logs --tail=20 workflow-engine | Select-String -Pattern "$taskId|STATE TRANSITION"
    Write-Host ""
    Write-Host "Task Management Logs:" -ForegroundColor Cyan
    docker compose logs --tail=20 task-management | Select-String -Pattern "$taskId|TASK ASSIGNMENT"
}
Write-Host ""

Write-Host "Step 9: Verify State Changes" -ForegroundColor Yellow
Write-Host "-----------------------------"
$query = @"
SELECT 
  id, 
  status, 
  machine_state->'context'->>'currentStage' as current_stage,
  machine_state->'context'->>'previousStage' as previous_stage,
  machine_state->'value' as state_value
FROM tasks 
WHERE id = '$taskId';
"@
Write-Host "Task state after submission:"
$afterState = docker exec welo-postgres psql -U postgres -d welo_platform -c $query
Write-Host $afterState
Write-Host ""

$query = "SELECT id, user_id, workflow_stage, status, assignment_order FROM assignments WHERE task_id = '$taskId' ORDER BY assignment_order;"
Write-Host "Assignments after submission:"
$afterAssignments = docker exec welo-postgres psql -U postgres -d welo_platform -c $query
Write-Host $afterAssignments
Write-Host ""

Write-Host "Step 10: Verification Summary" -ForegroundColor Yellow
Write-Host "------------------------------"

# Check if state transitioned
if ($afterState -match "stage_review" -or $afterState -match "REVIEW") {
    Write-Host "✅ Task transitioned to review stage" -ForegroundColor Green
} else {
    Write-Host "❌ Task did not transition to review stage" -ForegroundColor Red
}

# Check if new assignment created
$assignmentCountBefore = ($beforeAssignments -split "`n").Count
$assignmentCountAfter = ($afterAssignments -split "`n").Count
if ($assignmentCountAfter -gt $assignmentCountBefore) {
    Write-Host "✅ New assignment created for reviewer" -ForegroundColor Green
} else {
    Write-Host "❌ No new assignment created" -ForegroundColor Red
}

# Check task status
if ($afterState -match "SUBMITTED") {
    Write-Host "✅ Task status updated to SUBMITTED" -ForegroundColor Green
} else {
    Write-Host "⚠️  Task status: $(($afterState -split "`n")[1].Trim())" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Additional Checks:" -ForegroundColor Yellow
Write-Host "- Review workflow-engine logs: docker compose logs workflow-engine | grep '$taskId'" -ForegroundColor Gray
Write-Host "- Review task-management logs: docker compose logs task-management | grep '$taskId'" -ForegroundColor Gray
Write-Host "- Check Kafka messages: docker exec -it welo-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic state.transitioned --from-beginning --max-messages 5" -ForegroundColor Gray
