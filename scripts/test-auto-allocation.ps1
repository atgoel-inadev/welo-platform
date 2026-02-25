# Test Script for Auto-Allocation Fix
# This script verifies that auto-allocation only assigns to project team members

Write-Host "=== Auto-Allocation Test Script ===" -ForegroundColor Cyan
Write-Host "Testing project-specific allocation with workflow stage support" -ForegroundColor White
Write-Host ""

# Configuration
$projectId = "0b5f3e17-acd2-416b-bcd9-568d783cbc33" # Genz sentiment analysis
$baseUrl = "http://localhost:3004/api/v1"
$taskUrl = "http://localhost:3003/api/v1"

# Step 1: Get project team members
Write-Host "Step 1: Fetching project team members..." -ForegroundColor Yellow
try {
    $team = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId/team"
    $annotators = $team.data | Where-Object { $_.role -eq 'ANNOTATOR' }
    $reviewers = $team.data | Where-Object { $_.role -eq 'REVIEWER' }
    
    Write-Host "[PASS] Project Team:" -ForegroundColor Green
    Write-Host "  Annotators: $($annotators.Count)" -ForegroundColor White
    foreach ($ann in $annotators) {
        Write-Host "    - $($ann.user.name) ($($ann.userId))" -ForegroundColor Gray
    }
    Write-Host "  Reviewers: $($reviewers.Count)" -ForegroundColor White
    foreach ($rev in $reviewers) {
        Write-Host "    - $($rev.user.name) ($($rev.userId))" -ForegroundColor Gray
    }
    
    $annotatorIds = $annotators | ForEach-Object { $_.userId }
    $reviewerIds = $reviewers | ForEach-Object { $_.userId }
} catch {
    Write-Host "[FAIL] Failed to fetch team members: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Create a test batch
Write-Host ""
Write-Host "Step 2: Creating test batch..." -ForegroundColor Yellow
try {
    $createBatchBody = @{
        projectId = $projectId
        name = "Auto-Allocation Test - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        description = "Testing auto-allocation with project team filtering"
        priority = 5
    } | ConvertTo-Json
    
    $batch = Invoke-RestMethod -Uri "$baseUrl/batches" `
        -Method Post `
        -ContentType "application/json" `
        -Body $createBatchBody
    
    Write-Host "[PASS] Created batch: $($batch.name)" -ForegroundColor Green
    Write-Host "  Batch ID: $($batch.id)" -ForegroundColor Gray
    $batchId = $batch.id
} catch {
    Write-Host "[FAIL] Failed to create batch: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Allocate test files
Write-Host ""
Write-Host "Step 3: Allocating test files..." -ForegroundColor Yellow
try {
    $files = @()
    for ($i = 1; $i -le 10; $i++) {
        $files += @{
            externalId = "test-alloc-$i.txt"
            fileUrl = "/test/file-$i.txt"
            fileType = "TEXT"
            fileName = "file-$i.txt"
            fileSize = 1024
        }
    }
    
    $allocateBody = @{
        files = $files
        taskType = "ANNOTATION"
        autoAssign = $false
    } | ConvertTo-Json -Depth 10
    
    $allocResult = Invoke-RestMethod -Uri "$baseUrl/batches/$batchId/allocate-files" `
        -Method Post `
        -ContentType "application/json" `
        -Body $allocateBody
    
    Write-Host "[PASS] Allocated $($allocResult.createdTasks) tasks" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Failed to allocate files: $_" -ForegroundColor Red
    Write-Host "  Error detail: $($_.Exception.Message)" -ForegroundColor Red
    # Continue anyway to test with existing batches
}

# Step 4: Auto-assign tasks
Write-Host ""
Write-Host "Step 4: Running auto-assignment..." -ForegroundColor Yellow
try {
    $assignBody = @{
        assignmentMethod = "AUTO_ROUND_ROBIN"
    } | ConvertTo-Json
    
    $assignResult = Invoke-RestMethod -Uri "$baseUrl/batches/$batchId/auto-assign" `
        -Method Post `
        -ContentType "application/json" `
        -Body $assignBody
    
    Write-Host "[PASS] Auto-assigned $($assignResult.assignedCount) tasks" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Failed to auto-assign: $_" -ForegroundColor Red
    exit 1
}

# Step 5: Verify assignments
Write-Host ""
Write-Host "Step 5: Verifying assignments..." -ForegroundColor Yellow
try {
    if ($assignResult.assignedCount -gt 0) {
        $tasks = Invoke-RestMethod -Uri "$taskUrl/tasks?batchId=$batchId&page=1&pageSize=100"
        $assignedTasks = $tasks.data | Where-Object { $_.assignedTo }
        
        Write-Host "[INFO] Assigned tasks: $($assignedTasks.Count)" -ForegroundColor Green
        
        # Check if all assignments are to project team members
        $invalidAssignments = @()
        $assignmentDistribution = @{}
        
        foreach ($task in $assignedTasks) {
            $userId = $task.assignedTo
            
            # Count assignments per user
            if ($assignmentDistribution.ContainsKey($userId)) {
                $assignmentDistribution[$userId]++
            } else {
                $assignmentDistribution[$userId] = 1
            }
            
            # Check if user is in project team
            if ($userId -notin $annotatorIds -and $userId -notin $reviewerIds) {
                $invalidAssignments += @{
                    taskId = $task.id
                    externalId = $task.externalId
                    assignedTo = $userId
                }
            }
        }
        
        # Report results
        if ($invalidAssignments.Count -gt 0) {
            Write-Host "[FAIL] Found $($invalidAssignments.Count) tasks assigned to non-team members!" -ForegroundColor Red
            foreach ($inv in $invalidAssignments) {
                Write-Host "  - Task $($inv.externalId) assigned to $($inv.assignedTo)" -ForegroundColor Red
            }
        } else {
            Write-Host "[PASS] All assignments are to project team members" -ForegroundColor Green
        }
        
        # Show distribution
        Write-Host ""
        Write-Host "Assignment Distribution:" -ForegroundColor White
        foreach ($userId in $assignmentDistribution.Keys) {
            $member = $team.data | Where-Object { $_.userId -eq $userId }
            $name = if ($member) { $member.user.name } else { "Unknown ($userId)" }
            $role = if ($member) { $member.role } else { "N/A" }
            Write-Host "  $name [$role]: $($assignmentDistribution[$userId]) tasks" -ForegroundColor Gray
        }
        
        # Check round-robin distribution
        $minAssignments = ($assignmentDistribution.Values | Measure-Object -Minimum).Minimum
        $maxAssignments = ($assignmentDistribution.Values | Measure-Object -Maximum).Maximum
        $difference = $maxAssignments - $minAssignments
        
        if ($difference -le 1) {
            Write-Host "[PASS] Round-robin distribution is balanced (diff: $difference)" -ForegroundColor Green
        } else {
            Write-Host "[WARN] Round-robin distribution has variance (diff: $difference)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[WARN] No tasks were assigned (batch might be empty)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[FAIL] Failed to verify assignments: $_" -ForegroundColor Red
    Write-Host "  Error detail: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
