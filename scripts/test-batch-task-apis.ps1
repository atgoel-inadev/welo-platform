# Batch & Task Management API Testing Script
# Location: scripts/test-batch-task-apis.ps1
# Usage: .\scripts\test-batch-task-apis.ps1

$ErrorActionPreference = "Continue"

# Configuration
$projectManagementUrl = "http://localhost:3004/api/v1"
$taskManagementUrl = "http://localhost:3003/api/v1"

# Test Data (replace with your actual IDs)
$batchId = "36818a3a-2255-4716-96c9-dc76da06f7eb"
$taskId = "a3a6dc41-20fc-4312-be63-606494eb48e0"
$userId = "650e8400-e29b-41d4-a716-446655440022"

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  Batch & Task Management API Testing" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

#region Batch APIs (Project Management Service - Port 3004)

Write-Host "`n[BATCH APIs - Project Management Service]" -ForegroundColor Green

# Test 1: List all batches
Write-Host "`n1. GET /batches - List all batches" -ForegroundColor Yellow
try {
  $batches = Invoke-RestMethod -Uri "$projectManagementUrl/batches"
  Write-Host "✅ Success: Found $($batches.length) batches" -ForegroundColor Green
  if ($batches.length -gt 0) {
    $batches[0] | Select-Object id, name, status, taskCount | Format-List
  }
} catch {
  Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Get batch by ID
Write-Host "`n2. GET /batches/:id - Get batch details" -ForegroundColor Yellow
try {
  $batch = Invoke-RestMethod -Uri "$projectManagementUrl/batches/$batchId"
  Write-Host "✅ Success: Retrieved batch '$($batch.name)'" -ForegroundColor Green
  $batch | Select-Object id, name, status, taskCount, createdAt | Format-List
} catch {
  Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Get batch statistics
Write-Host "`n3. GET /batches/:id/statistics - Get batch statistics" -ForegroundColor Yellow
try {
  $stats = Invoke-RestMethod -Uri "$projectManagementUrl/batches/$batchId/statistics"
  Write-Host "✅ Success: Retrieved statistics" -ForegroundColor Green
  $stats | Format-List
} catch {
  Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

#endregion

#region Task APIs (Task Management Service - Port 3003)

Write-Host "`n`n[TASK APIs - Task Management Service]" -ForegroundColor Green

# Test 4: List tasks by batch
Write-Host "`n4. GET /tasks?batchId=... - List tasks in batch" -ForegroundColor Yellow
try {
  $response = Invoke-RestMethod -Uri "$taskManagementUrl/tasks?batchId=$batchId"
  Write-Host "✅ Success: Found $($response.total) tasks" -ForegroundColor Green
  if ($response.tasks.length -gt 0) {
    Write-Host "`nFirst task details:" -ForegroundColor Cyan
    $response.tasks[0] | Select-Object fileName, status, assignedTo, workflowStage | Format-List
  }
} catch {
  Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Get single task
Write-Host "`n5. GET /tasks/:id - Get task details" -ForegroundColor Yellow
try {
  $task = Invoke-RestMethod -Uri "$taskManagementUrl/tasks/$taskId"
  Write-Host "✅ Success: Retrieved task" -ForegroundColor Green
  $task | Select-Object id, fileName, status, assignedTo, workflowStage | Format-List
} catch {
  Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

#endregion

#region Assignment APIs (Task Management Service - Port 3003)

Write-Host "`n`n[ASSIGNMENT APIs - Task Management Service]" -ForegroundColor Green

# Test 6: Unassign task (cleanup for testing)
Write-Host "`n6. POST /tasks/:id/unassign - Unassign task" -ForegroundColor Yellow
try {
  $unassigned = Invoke-RestMethod -Uri "$taskManagementUrl/tasks/$taskId/unassign" `
    -Method Post -ContentType "application/json"
  Write-Host "✅ Success: Task unassigned" -ForegroundColor Green
  $unassigned.task | Select-Object id, status, assignedTo | Format-List
} catch {
  Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Assign task to user
Write-Host "`n7. POST /tasks/:id/assign - Assign task to user" -ForegroundColor Yellow
try {
  $assignBody = @{
    userId = $userId
    workflowStage = "ANNOTATION"
  } | ConvertTo-Json
  
  $assigned = Invoke-RestMethod -Uri "$taskManagementUrl/tasks/$taskId/assign" `
    -Method Post -Body $assignBody -ContentType "application/json"
  Write-Host "✅ Success: Task assigned" -ForegroundColor Green
  Write-Host "`nAssignment details:" -ForegroundColor Cyan
  $assigned.assignment | Select-Object id, userId, workflowStage, status | Format-List
  Write-Host "`nTask details:" -ForegroundColor Cyan
  $assigned.task | Select-Object id, status, assignedTo, workflowStage | Format-List
} catch {
  Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Reassign task to different user
Write-Host "`n8. POST /tasks/:id/reassign - Reassign task to different user" -ForegroundColor Yellow
try {
  $reassignBody = @{
    userId = $userId
    workflowStage = "REVIEW"
  } | ConvertTo-Json
  
  $reassigned = Invoke-RestMethod -Uri "$taskManagementUrl/tasks/$taskId/reassign" `
    -Method Post -Body $reassignBody -ContentType "application/json"
  Write-Host "✅ Success: Task reassigned" -ForegroundColor Green
  Write-Host "`nNew assignment:" -ForegroundColor Cyan
  $reassigned.assignment | Select-Object userId, workflowStage, assignmentOrder | Format-List
} catch {
  Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

#endregion

#region Auto-Assign API (Project Management Service - Port 3004)

Write-Host "`n`n[AUTO-ASSIGN API - Project Management Service]" -ForegroundColor Green

# Test 9: Auto-assign tasks in batch
Write-Host "`n9. POST /batches/:id/auto-assign - Auto-assign tasks" -ForegroundColor Yellow
try {
  $autoAssignBody = @{
    method = "ROUND_ROBIN"
    annotatorIds = @($userId)
  } | ConvertTo-Json
  
  $autoAssigned = Invoke-RestMethod -Uri "$projectManagementUrl/batches/$batchId/auto-assign" `
    -Method Post -Body $autoAssignBody -ContentType "application/json"
  Write-Host "✅ Success: Auto-assigned $($autoAssigned.assigned) tasks" -ForegroundColor Green
  $autoAssigned | Select-Object assigned, method | Format-List
} catch {
  Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

#endregion

#region Error Case Testing

Write-Host "`n`n[ERROR CASE Testing]" -ForegroundColor Green

# Test 10: Invalid batch ID (404)
Write-Host "`n10. GET /batches/:id with invalid ID - Expect 404" -ForegroundColor Yellow
try {
  $invalidId = "00000000-0000-0000-0000-000000000000"
  Invoke-RestMethod -Uri "$projectManagementUrl/batches/$invalidId"
  Write-Host "❌ Unexpected: Should have returned 404" -ForegroundColor Red
} catch {
  if ($_.Exception.Response.StatusCode -eq 404) {
    Write-Host "✅ Expected: Received 404 Not Found" -ForegroundColor Green
  } else {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}

# Test 11: Invalid assignment request (400)
Write-Host "`n11. POST /tasks/:id/assign with missing userId - Expect 400" -ForegroundColor Yellow
try {
  $invalidBody = @{
    workflowStage = "ANNOTATION"
    # Missing userId
  } | ConvertTo-Json
  
  Invoke-RestMethod -Uri "$taskManagementUrl/tasks/$taskId/assign" `
    -Method Post -Body $invalidBody -ContentType "application/json"
  Write-Host "❌ Unexpected: Should have returned 400" -ForegroundColor Red
} catch {
  if ($_.Exception.Response.StatusCode -eq 400) {
    Write-Host "✅ Expected: Received 400 Bad Request" -ForegroundColor Green
  } else {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}

#endregion

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "  Testing Complete!" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

Write-Host "`n📊 Summary:" -ForegroundColor White
Write-Host "  - Tested batch listing and retrieval" -ForegroundColor Gray
Write-Host "  - Tested task listing with filters" -ForegroundColor Gray
Write-Host "  - Tested assignment operations (assign, unassign, reassign)" -ForegroundColor Gray
Write-Host "  - Tested auto-assign functionality" -ForegroundColor Gray
Write-Host "  - Tested error cases (404, 400)" -ForegroundColor Gray

Write-Host "`n💡 Tips:" -ForegroundColor White
Write-Host "  - Update the test IDs at the top of this script" -ForegroundColor Gray
Write-Host "  - Run this BEFORE implementing frontend changes" -ForegroundColor Gray
Write-Host "  - Use this to validate backend after any changes" -ForegroundColor Gray
Write-Host "  - Check Docker logs if tests fail: docker compose logs -f <service>" -ForegroundColor Gray
