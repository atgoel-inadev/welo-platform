# Multi-Annotator Workflow Testing Script
# Tests batch allocation, multi-assignment creation, and workflow progression

$ErrorActionPreference = "Continue"

# Configuration
$taskServiceUrl = "http://localhost:3003/api/v1"
$projectServiceUrl = "http://localhost:3004/api/v1"
$projectId = "850e8400-e29b-41d4-a716-446655440001"
$batchId = "b50e8400-e29b-41d4-a716-446655440001"

# Test users (annotators)
$annotator1 = "550e8400-e29b-41d4-a716-446655440001" # Alice Johnson
$annotator2 = "550e8400-e29b-41d4-a716-446655440002" # Bob Smith
$annotator3 = "550e8400-e29b-41d4-a716-446655440003" # Carol Williams

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  MULTI-ANNOTATOR WORKFLOW TEST SUITE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Verify project configuration
Write-Host "[1] Verifying Project Configuration..." -ForegroundColor Yellow
try {
    $project = Invoke-RestMethod -Uri "$projectServiceUrl/projects/$projectId" -Method Get
    $workflowConfig = $project.configuration.workflowConfiguration
    $annotationStage = $workflowConfig.stages | Where-Object { $_.type -eq "annotation" }
    
    Write-Host "✓ Project: $($project.name)" -ForegroundColor Green
    Write-Host "  - Annotation Stage: $($annotationStage.name)" -ForegroundColor Gray
    Write-Host "  - Annotators Required: $($annotationStage.annotators_count)" -ForegroundColor Gray
    Write-Host "  - Auto-Assign: $($annotationStage.auto_assign)" -ForegroundColor Gray
    
    if ($annotationStage.annotators_count -lt 2) {
        Write-Host "`n⚠ WARNING: Project configured for only $($annotationStage.annotators_count) annotator(s)" -ForegroundColor Red
        Write-Host "Run update-multi-annotator-config.sql to enable multi-annotator mode`n" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Failed to get project configuration: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: List tasks in batch
Write-Host "`n[2] Fetching Tasks in Batch..." -ForegroundColor Yellow
try {
    $taskListResponse = Invoke-RestMethod -Uri "$taskServiceUrl/tasks?batchId=$batchId" -Method Get
    $tasks = $taskListResponse.tasks
    
    if ($tasks.Count -eq 0) {
        Write-Host "✗ No tasks found in batch $batchId" -ForegroundColor Red
        Write-Host "Create a batch with tasks first" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Found $($tasks.Count) tasks in batch" -ForegroundColor Green
    
    # Display task assignment progress
    Write-Host "`nTask Assignment Progress:" -ForegroundColor Cyan
    Write-Host ("{0,-12} {1,-25} {2,-15} {3,-20} {4,-20}" -f "Task#", "TaskId", "Status", "Annotation Progress", "Review Progress") -ForegroundColor Gray
    Write-Host ("{0,-12} {1,-25} {2,-15} {3,-20} {4,-20}" -f "-----", "------", "------", "------------------", "----------------") -ForegroundColor Gray
    
    foreach ($task in $tasks) {
        $annotationProgress = $task.assignmentProgress.annotation
        $reviewProgress = $task.assignmentProgress.review
        
        $annotationStatus = "$($annotationProgress.completed)/$($annotationProgress.total) completed"
        $reviewStatus = "$($reviewProgress.completed)/$($reviewProgress.total) completed"
        
        $statusColor = switch ($task.status) {
            "ASSIGNED" { "Yellow" }
            "IN_PROGRESS" { "Cyan" }
            "SUBMITTED" { "Blue" }
            "COMPLETED" { "Green" }
            default { "White" }
        }
        
        Write-Host ("{0,-12} {1,-25} {2,-15} {3,-20} {4,-20}" -f 
            $task.externalId,
            $task.id.Substring(0, 24) + "...",
            $task.status,
            $annotationStatus,
            $reviewStatus
        ) -ForegroundColor $statusColor
    }
    
    # Pick first task for detailed testing
    $testTask = $tasks[0]
    Write-Host "`n✓ Selected Task: $($testTask.externalId) for detailed testing" -ForegroundColor Green
    
} catch {
    Write-Host "✗ Failed to fetch tasks: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Get detailed assignment info for test task
Write-Host "`n[3] Checking Assignment Details for Task: $($testTask.externalId)..." -ForegroundColor Yellow
try {
    $assignmentDetails = Invoke-RestMethod -Uri "$taskServiceUrl/tasks/$($testTask.id)/assignments" -Method Get
    
    Write-Host "✓ Task Assignment Details:" -ForegroundColor Green
    Write-Host "  - Total Assignments: $($assignmentDetails.assignments.Count)" -ForegroundColor Gray
    Write-Host "  - Annotation Progress: $($assignmentDetails.progress.annotation.completed)/$($assignmentDetails.progress.annotation.required) completed" -ForegroundColor Gray
    Write-Host "  - Review Progress: $($assignmentDetails.progress.review.completed)/$($assignmentDetails.progress.review.required) completed" -ForegroundColor Gray
    
    if ($assignmentDetails.assignments.Count -eq 0) {
        Write-Host "`n⚠ WARNING: Task has NO assignments created!" -ForegroundColor Red
        Write-Host "Batch auto-assignment may have failed during batch creation" -ForegroundColor Red
        Write-Host "Check batch.service.ts autoAssignTasks() logic`n" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "`n  Individual Assignments:" -ForegroundColor Cyan
    Write-Host "  {0,-12} {1,-25} {2,-15} {3,-20}" -f "User", "AssignmentId", "Stage", "Status" -ForegroundColor Gray
    Write-Host "  {0,-12} {1,-25} {2,-15} {3,-20}" -f "----", "------------", "-----", "------" -ForegroundColor Gray
    
    foreach ($assignment in $assignmentDetails.assignments) {
        $statusColor = switch ($assignment.status) {
            "ASSIGNED" { "Yellow" }
            "IN_PROGRESS" { "Cyan" }
            "COMPLETED" { "Green" }
            default { "White" }
        }
        
        Write-Host ("  {0,-12} {1,-25} {2,-15} {3,-20}" -f 
            $assignment.userId.Substring(0, 12),
            $assignment.id.Substring(0, 24) + "...",
            $assignment.workflowStage,
            $assignment.status
        ) -ForegroundColor $statusColor
    }
    
    # Store first incomplete assignment for simulation
    $incompleteAssignment = $assignmentDetails.assignments | Where-Object { $_.status -ne "COMPLETED" } | Select-Object -First 1
    
    if (-not $incompleteAssignment) {
        Write-Host "`n✓ All assignments completed for this task" -ForegroundColor Green
        Write-Host "Task should have progressed to next stage automatically" -ForegroundColor Green
    }
    
} catch {
    Write-Host "✗ Failed to get assignment details: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Simulate task submission (if there's an incomplete assignment)
if ($incompleteAssignment) {
    Write-Host "`n[4] Simulating Task Submission..." -ForegroundColor Yellow
    Write-Host "⚠ NOTE: This would normally submit annotation data" -ForegroundColor Cyan
    Write-Host "  Assignment: $($incompleteAssignment.id.Substring(0, 24))..." -ForegroundColor Gray
    Write-Host "  User: $($incompleteAssignment.userId)" -ForegroundColor Gray
    Write-Host "  Stage: $($incompleteAssignment.workflowStage)" -ForegroundColor Gray
    
    $submitBody = @{
        taskId = $testTask.id
        assignmentId = $incompleteAssignment.id
        annotationData = @{
            labels = @("positive")
            confidence = 0.95
        }
        responses = @(
            @{
                questionId = "q1"
                response = "positive"
                confidenceScore = 0.95
                timeSpent = 45
            },
            @{
                questionId = "q2"
                response = "5"
                confidenceScore = 1.0
                timeSpent = 10
            }
        )
        timeSpent = 60
        confidenceScore = 0.95
    } | ConvertTo-Json -Depth 5
    
    Write-Host "`nSubmission Payload Preview:" -ForegroundColor Cyan
    Write-Host $submitBody -ForegroundColor Gray
    
    Write-Host "`n⚠ Uncomment the code below to actually submit (will modify database):" -ForegroundColor Yellow
    Write-Host "# try {" -ForegroundColor DarkGray
    Write-Host "#     `$result = Invoke-RestMethod -Uri `"$taskServiceUrl/tasks/submit`" -Method Post -Body `$submitBody -ContentType 'application/json'" -ForegroundColor DarkGray
    Write-Host "#     Write-Host `"✓ Task submitted successfully`" -ForegroundColor Green" -ForegroundColor DarkGray
    Write-Host "# } catch {" -ForegroundColor DarkGray
    Write-Host "#     Write-Host `"✗ Submission failed: `$(`$_.Exception.Message)`" -ForegroundColor Red" -ForegroundColor DarkGray
    Write-Host "# }" -ForegroundColor DarkGray
}

# Step 5: Check workflow progression logs
Write-Host "`n[5] Checking Service Logs for Workflow Progression..." -ForegroundColor Yellow
Write-Host "Run: docker compose logs -f task-management | Select-String 'Workflow'" -ForegroundColor Cyan
Write-Host "Look for:" -ForegroundColor Gray
Write-Host "  - [Workflow Trigger] Starting workflow progression" -ForegroundColor Gray
Write-Host "  - [Workflow Check] Assignment completion status" -ForegroundColor Gray
Write-Host "  - [Workflow Wait] Waiting for more assignments" -ForegroundColor Gray
Write-Host "  - [Workflow Progress] Ready to advance" -ForegroundColor Gray
Write-Host "  - [Workflow Advanced] Stage transition completed" -ForegroundColor Gray

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY & NEXT STEPS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Key Observations:" -ForegroundColor Yellow
Write-Host "1. Project configured for $($annotationStage.annotators_count) annotators per task" -ForegroundColor Gray
Write-Host "2. Task '$($testTask.externalId)' has $($assignmentDetails.assignments.Count) assignment(s)" -ForegroundColor Gray

if ($assignmentDetails.assignments.Count -lt $annotationStage.annotators_count) {
    Write-Host "`n⚠ ISSUE DETECTED:" -ForegroundColor Red
    Write-Host "Expected $($annotationStage.annotators_count) assignments but found $($assignmentDetails.assignments.Count)" -ForegroundColor Red
    Write-Host "Check batch.service.ts autoAssignTasks() during batch creation" -ForegroundColor Red
} elseif ($assignmentDetails.progress.annotation.completed -eq $annotationStage.annotators_count) {
    Write-Host "`n✓ All annotators completed their assignments" -ForegroundColor Green
    Write-Host "Task should automatically progress to review stage" -ForegroundColor Green
    Write-Host "Check docker logs to verify workflow progression triggered" -ForegroundColor Yellow
} else {
    Write-Host "`n✓ Multi-annotator workflow is partially complete" -ForegroundColor Green
    Write-Host "Still waiting for $($annotationStage.annotators_count - $assignmentDetails.progress.annotation.completed) more annotator(s)" -ForegroundColor Yellow
}

Write-Host "`nNext Actions:" -ForegroundColor Cyan
Write-Host "1. Check service logs: docker compose logs -f task-management" -ForegroundColor Gray
Write-Host "2. Verify database: SELECT * FROM assignments WHERE task_id = '$($testTask.id)';" -ForegroundColor Gray
Write-Host "3. If assignments missing, check batch creation logs during auto-assignment" -ForegroundColor Gray
Write-Host "4. If workflow not progressing, check [Workflow] logs for errors`n" -ForegroundColor Gray
