# Workflow Progression Debugging Guide

Write-Host "`n========== WORKFLOW PROGRESSION DEBUG GUIDE ==========" -ForegroundColor Cyan

Write-Host "`n[Step 1] Verify Services Running:" -ForegroundColor Yellow
Write-Host "  Task Management Service: http://localhost:3003" -ForegroundColor White
Write-Host "  Project Management Service: http://localhost:3004" -ForegroundColor White
Write-Host "  Database: docker exec welo-postgres psql -U postgres -d welo_platform" -ForegroundColor White

Write-Host "`n[Step 2] Test Workflow Progression:" -ForegroundColor Yellow
Write-Host "  1. Login to UI as an annotator" -ForegroundColor White
Write-Host "  2. Open an ASSIGNED task" -ForegroundColor White
Write-Host "  3. Complete the annotation" -ForegroundColor White
Write-Host "  4. Click Submit button" -ForegroundColor White
Write-Host "  5. Watch terminal where task-management service is running" -ForegroundColor White

Write-Host "`n[Step 3] Look for these logs:" -ForegroundColor Yellow
Write-Host "  SUCCESS Pattern:" -ForegroundColor Green
Write-Host "    ========== WORKFLOW PROGRESSION START ==========" -ForegroundColor Gray
Write-Host "    [Step 1] Loading task..." -ForegroundColor Gray
Write-Host "    [Step 2] Task found. Status: SUBMITTED" -ForegroundColor Gray
Write-Host "    [Step 3] Workflow config loaded" -ForegroundColor Gray
Write-Host "    [Step 4] Machine state currentStage: stage_annotation" -ForegroundColor Gray
Write-Host "    [Step 5] Current stage found: Annotation" -ForegroundColor Gray
Write-Host "    [Step 6] Checking assignments" -ForegroundColor Gray
Write-Host "    [Step 7] Assignment Status Check" -ForegroundColor Gray
Write-Host "    [SUCCESS] All assignments completed! Ready to progress" -ForegroundColor Gray
Write-Host "    [Step 8] Progressing to next stage: Review" -ForegroundColor Gray

Write-Host "`n[Step 4] Common Issues:" -ForegroundColor Yellow
Write-Host "  Issue: No logs appear at all" -ForegroundColor Red
Write-Host "  Fix: Check if progressWorkflowAfterSubmission is called" -ForegroundColor White
Write-Host ""
Write-Host "  Issue: [FAILED] Task has no currentStage" -ForegroundColor Red
Write-Host "  Fix: Run backfill script to initialize machine states" -ForegroundColor White
Write-Host ""
Write-Host "  Issue: [WAIT] Still need X more assignments" -ForegroundColor Red
Write-Host "  Fix: This is expected for multi-annotator tasks" -ForegroundColor White
Write-Host "  All annotators must complete before progressing" -ForegroundColor White

Write-Host "`n[Step 5] Database Queries:" -ForegroundColor Yellow
Write-Host "  Check task machine state:" -ForegroundColor White
Write-Host "    docker exec welo-postgres psql -U postgres -d welo_platform" -ForegroundColor Gray
Write-Host "    Then run: SELECT id, status FROM tasks WHERE project_id = '850e8400-e29b-41d4-a716-446655440001' LIMIT 5;" -ForegroundColor Gray
Write-Host ""
Write-Host "  Check assignments:" -ForegroundColor White
Write-Host "    docker exec welo-postgres psql -U postgres -d welo_platform" -ForegroundColor Gray
Write-Host "    Then run: SELECT task_id, user_id, workflow_stage, status FROM assignments LIMIT 10;" -ForegroundColor Gray

Write-Host "`n========== Ready to Test! ==========" -ForegroundColor Cyan
Write-Host "Submit a task and watch the terminal logs" -ForegroundColor White
Write-Host ""
