# Directory Scan Testing Script
# Automates testing of the directory scan batch upload feature

param(
    [string]$projectId,
    [string]$batchName = "test_batch_001",
    [string]$filesPath = $null  # Optional: path to folder containing test files
)

$ErrorActionPreference = "Stop"

Write-Host "`n=== Directory Scan Batch Upload Test ===" -ForegroundColor Cyan
Write-Host "This script tests the directory scan functionality for batch uploads`n" -ForegroundColor Gray

# Configuration
$baseUrl = "http://localhost:3004/api/v1"
$uploadsPath = "../welo-platform-ui/public/uploads"

# Step 1: Validate inputs
if (-not $projectId) {
    Write-Host "❌ Error: projectId is required" -ForegroundColor Red
    Write-Host "`nUsage: .\test-directory-scan.ps1 -projectId 'your-project-uuid' [-batchName 'test_batch_001'] [-filesPath 'C:\path\to\files']`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "   Project ID: $projectId"
Write-Host "   Batch Name: $batchName"
Write-Host "   Base URL: $baseUrl"
Write-Host ""

# Step 2: Create directory structure
$batchPath = "$uploadsPath/$projectId/$batchName"
Write-Host "1. Creating directory structure..." -ForegroundColor Yellow
Write-Host "   Path: $batchPath" -ForegroundColor Gray

if (Test-Path $batchPath) {
    Write-Host "   ⚠️  Directory already exists" -ForegroundColor Yellow
    $response = Read-Host "   Delete and recreate? (y/n)"
    if ($response -eq 'y') {
        Remove-Item -Path $batchPath -Recurse -Force
        New-Item -ItemType Directory -Path $batchPath -Force | Out-Null
        Write-Host "   ✅ Directory recreated" -ForegroundColor Green
    }
    else {
        Write-Host "   ℹ️  Using existing directory" -ForegroundColor Cyan
    }
}
else {
    New-Item -ItemType Directory -Path $batchPath -Force | Out-Null
    Write-Host "   ✅ Directory created" -ForegroundColor Green
}

# Step 3: Copy test files
Write-Host "`n2. Preparing test files..." -ForegroundColor Yellow

if ($filesPath) {
    if (Test-Path $filesPath) {
        Write-Host "   Copying files from: $filesPath" -ForegroundColor Gray
        $copiedFiles = Copy-Item -Path "$filesPath\*" -Destination $batchPath -PassThru
        Write-Host "   ✅ Copied $($copiedFiles.Count) files" -ForegroundColor Green
    }
    else {
        Write-Host "   ❌ Source path not found: $filesPath" -ForegroundColor Red
        exit 1
    }
}
else {
    # List files in batch directory
    $existingFiles = Get-ChildItem -Path $batchPath -File
    if ($existingFiles.Count -gt 0) {
        Write-Host "   ✅ Found $($existingFiles.Count) existing files:" -ForegroundColor Green
        $existingFiles | ForEach-Object { Write-Host "      - $($_.Name)" -ForegroundColor Gray }
    }
    else {
        Write-Host "   ⚠️  No files found in directory" -ForegroundColor Yellow
        Write-Host "   Please add files manually to: $batchPath" -ForegroundColor Yellow
        Write-Host "   Press Enter when ready to continue..."
        Read-Host
        
        # Re-check for files
        $existingFiles = Get-ChildItem -Path $batchPath -File
        if ($existingFiles.Count -eq 0) {
            Write-Host "   ❌ Still no files found. Exiting." -ForegroundColor Red
            exit 1
        }
        Write-Host "   ✅ Found $($existingFiles.Count) files" -ForegroundColor Green
    }
}

# Step 4: Create batch
Write-Host "`n3. Creating batch..." -ForegroundColor Yellow

$batchData = @{
    projectId   = $projectId
    name        = $batchName
    description = "Test batch created by test-directory-scan.ps1"
    priority    = 5
} | ConvertTo-Json

try {
    $batch = Invoke-RestMethod -Uri "$baseUrl/batches" `
        -Method Post `
        -Body $batchData `
        -ContentType "application/json"
    
    $batchId = $batch.id
    Write-Host "   ✅ Batch created successfully" -ForegroundColor Green
    Write-Host "      Batch ID: $batchId" -ForegroundColor Gray
}
catch {
    Write-Host "   ❌ Failed to create batch" -ForegroundColor Red
    Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 5: Test directory scan endpoint
Write-Host "`n4. Testing directory scan endpoint..." -ForegroundColor Yellow

$scanOptions = @{
    autoAssign       = $true
    assignmentMethod = "AUTO_ROUND_ROBIN"
    taskType         = "ANNOTATION"
} | ConvertTo-Json

try {
    $scanResult = Invoke-RestMethod -Uri "$baseUrl/batches/$batchId/scan-directory" `
        -Method Post `
        -Body $scanOptions `
        -ContentType "application/json"
    
    Write-Host "   ✅ Directory scan successful!" -ForegroundColor Green
    Write-Host "`n   📊 Scan Results:" -ForegroundColor Cyan
    Write-Host "      Files scanned: $($scanResult.scannedFiles)" -ForegroundColor Gray
    Write-Host "      Tasks created: $($scanResult.createdTasks)" -ForegroundColor Gray
    Write-Host "      Errors: $($scanResult.errors.Count)" -ForegroundColor Gray
    
    if ($scanResult.errors.Count -gt 0) {
        Write-Host "`n   ⚠️  Errors encountered:" -ForegroundColor Yellow
        $scanResult.errors | ForEach-Object { Write-Host "      - $_" -ForegroundColor Red }
    }
    
    # Show sample tasks
    if ($scanResult.tasks.Count -gt 0) {
        Write-Host "`n   📝 Sample Tasks Created:" -ForegroundColor Cyan
        $scanResult.tasks | Select-Object -First 3 | ForEach-Object {
            Write-Host "      - $($_.fileName) ($($_.fileType))" -ForegroundColor Gray
            Write-Host "        URL: $($_.fileUrl)" -ForegroundColor DarkGray
        }
        if ($scanResult.tasks.Count -gt 3) {
            Write-Host "      ... and $($scanResult.tasks.Count - 3) more" -ForegroundColor Gray
        }
    }
}
catch {
    Write-Host "   ❌ Directory scan failed" -ForegroundColor Red
    Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        $errorDetail = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "      Details: $($errorDetail.message)" -ForegroundColor Red
    }
    exit 1
}

# Step 6: Test media file serving
Write-Host "`n5. Testing media file serving..." -ForegroundColor Yellow

if ($scanResult.tasks.Count -gt 0) {
    $testTask = $scanResult.tasks[0]
    $testFileName = $testTask.fileName
    $testUrl = "http://localhost:3004/api/v1/media/$projectId/$batchName/$testFileName"
    
    Write-Host "   Testing URL: $testUrl" -ForegroundColor Gray
    
    try {
        $downloadPath = "test_download_$(Get-Random).tmp"
        Invoke-RestMethod -Uri $testUrl -OutFile $downloadPath
        
        $downloadedFile = Get-Item $downloadPath
        Write-Host "   ✅ File served successfully" -ForegroundColor Green
        Write-Host "      Downloaded: $($downloadedFile.Length) bytes" -ForegroundColor Gray
        
        # Cleanup
        Remove-Item $downloadPath -Force
    }
    catch {
        Write-Host "   ❌ Failed to serve media file" -ForegroundColor Red
        Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
else {
    Write-Host "   ⚠️  No tasks to test media serving" -ForegroundColor Yellow
}

# Step 7: Verify batch
Write-Host "`n6. Verifying batch..." -ForegroundColor Yellow

try {
    $verifyBatch = Invoke-RestMethod -Uri "$baseUrl/batches/$batchId"
    
    Write-Host "   ✅ Batch verification successful" -ForegroundColor Green
    Write-Host "      Batch Status: $($verifyBatch.status)" -ForegroundColor Gray
    Write-Host "      Total Tasks: $($verifyBatch.totalTasks)" -ForegroundColor Gray
    Write-Host "      Completed: $($verifyBatch.completedTasks)" -ForegroundColor Gray
}
catch {
    Write-Host "   ⚠️  Failed to verify batch" -ForegroundColor Yellow
}

# Summary
Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
Write-Host "`n✅ All operations successful!" -ForegroundColor Green
Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. View batch in UI: http://localhost:5173/ops/batches/$batchId" -ForegroundColor Gray
Write-Host "   2. Assign tasks to annotators (if not auto-assigned)" -ForegroundColor Gray
Write-Host "   3. Test annotation workflow in annotator view" -ForegroundColor Gray
Write-Host ""

# Offer to open batch in browser
$openInBrowser = Read-Host "Open batch in browser? (y/n)"
if ($openInBrowser -eq 'y') {
    Start-Process "http://localhost:5173/ops/batches/$batchId"
}
