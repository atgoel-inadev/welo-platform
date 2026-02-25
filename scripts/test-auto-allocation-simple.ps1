# Simple Auto-Allocation Test
# Tests auto-allocation on an existing batch

Write-Host "=== Simple Auto-Allocation Test ===" -ForegroundColor Cyan
Write-Host ""

# Find a batch with unassigned tasks
$projectId = "850e8400-e29b-41d4-a716-446655440001" # Sentiment Analysis Dataset
$batchId = "950e8400-e29b-41d4-a716-446655440002"   # Batch 2 - Product Reviews

Write-Host "Testing with:" -ForegroundColor Yellow
Write-Host "  Project: Sentiment Analysis Dataset" -ForegroundColor Gray
Write-Host "  Batch: Batch 2 - Product Reviews" -ForegroundColor Gray
Write-Host ""

# Step 1: Get project team
Write-Host "Step 1: Fetching project team..." -ForegroundColor Yellow
$team = Invoke-RestMethod -Uri "http://localhost:3004/api/v1/projects/$projectId/team"
$annotators = $team.data | Where-Object { $_.role -eq 'ANNOTATOR' }

Write-Host "[PASS] Found $($annotators.Count) annotators:" -ForegroundColor Green
foreach ($ann in $annotators) {
    Write-Host "  - $($ann.user.name) ($($ann.userId))" -ForegroundColor Gray
}

$annotatorIds = $annotators | ForEach-Object { $_.userId }
Write-Host ""

# Step 2: Check existing task assignments
Write-Host "Step 2: Checking current assignments..." -ForegroundColor Yellow
$tasksBefore = Invoke-RestMethod -Uri "http://localhost:3003/api/v1/tasks?batchId=$batchId&page=1&pageSize=100"
$assignedBefore = $tasksBefore.data | Where-Object { $_.assignedTo }
$unassignedBefore = $tasksBefore.data | Where-Object { -not $_.assignedTo }

Write-Host "[INFO] Current state:" -ForegroundColor Cyan
Write-Host "  Total tasks: $($tasksBefore.data.Count)" -ForegroundColor Gray
Write-Host "  Assigned: $($assignedBefore.Count)" -ForegroundColor Gray
Write-Host "  Unassigned: $($unassignedBefore.Count)" -ForegroundColor Gray
Write-Host ""

# Step 3: Run auto-assignment
Write-Host "Step 3: Running auto-assignment..." -ForegroundColor Yellow
$assignBody = @{
    assignmentMethod = "AUTO_ROUND_ROBIN"
} | ConvertTo-Json

$assignResult = Invoke-RestMethod -Uri "http://localhost:3004/api/v1/batches/$batchId/auto-assign" `
    -Method Post `
    -ContentType "application/json" `
    -Body $assignBody

Write-Host "[PASS] Auto-assigned $($assignResult.assignedCount) tasks" -ForegroundColor Green
Write-Host ""

# Step 4: Verify assignments
if ($assignResult.assignedCount -gt 0) {
    Write-Host "Step 4: Verifying assignments..." -ForegroundColor Yellow
    
    # Wait a moment for the assignments to be processed
    Start-Sleep -Seconds 1
    
    $tasksAfter = Invoke-RestMethod -Uri "http://localhost:3003/api/v1/tasks?batchId=$batchId&page=1&pageSize=100"
    $assignedAfter = $tasksAfter.data | Where-Object { $_.assignedTo }
    
    # Check if all newly assigned tasks are to project team members
    $invalidAssignments = @()
    $assignmentCounts = @{}
    
    foreach ($task in $assignedAfter) {
        $userId = $task.assignedTo
        
        # Count
        if ($assignmentCounts.ContainsKey($userId)) {
            $assignmentCounts[$userId]++
        } else {
            $assignmentCounts[$userId] = 1
        }
        
        # Validate
        if ($userId -notin $annotatorIds) {
            $invalidAssignments += $userId
        }
    }
    
    # Results
    if ($invalidAssignments.Count -gt 0) {
        Write-Host "[FAIL] Found assignments to non-team members!" -ForegroundColor Red
        $invalidAssignments | Select-Object -Unique | ForEach-Object {
            Write-Host "  - User ID: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "[PASS] All assignments are to project team members!" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Assignment Distribution:" -ForegroundColor White
    foreach ($userId in $assignmentCounts.Keys) {
        $member = $team.data | Where-Object { $_.userId -eq $userId }
        $name = if ($member) { $member.user.name } else { "UNKNOWN ($userId)" }
        $role = if ($member) { $member.role } else { "N/A" }
        Write-Host "  $name [$role]: $($assignmentCounts[$userId]) tasks" -ForegroundColor Gray
    }
    
    # Check distribution balance
    $min = ($assignmentCounts.Values | Measure-Object -Minimum).Minimum
    $max = ($assignmentCounts.Values | Measure-Object -Maximum).Maximum
    $diff = $max - $min
    
    Write-Host ""
    if ($diff -le 1) {
        Write-Host "[PASS] Round-robin distribution is balanced (max diff: $diff)" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Distribution variance: $diff (min: $min, max: $max)" -ForegroundColor Yellow
    }
} else {
    Write-Host "[INFO] No tasks were assigned (all tasks may already be assigned)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
