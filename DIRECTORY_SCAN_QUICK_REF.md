# Directory Scan - Quick Reference

## 🚀 Quick Start (3 Steps)

### 1. Create Folder & Add Files
```powershell
# Get project ID from UI or database
$projectId = "your-project-uuid"
$batchName = "demo_batch_001"

# Create folder
mkdir "../welo-platform-ui/public/uploads/$projectId/$batchName"

# Add files (drag & drop or copy)
cp your_files/* "../welo-platform-ui/public/uploads/$projectId/$batchName/"
```

### 2. Use UI
1. Go to: http://localhost:5173/ops/batch-upload
2. Select: **📁 Scan Directory (DEMO)**
3. Choose: Project (must match `$projectId`)
4. Enter: Batch name (must match `$batchName`)
5. Click: **Scan Directory & Create Tasks**

### 3. Verify
- Tasks created automatically
- Navigate to batch details
- Open task in annotator → File should load

---

## 📋 PowerShell Testing

### Quick Test (Automated)
```powershell
cd scripts
.\test-directory-scan.ps1 -projectId "your-project-uuid" -batchName "test_001"
```

### Manual Test
```powershell
# 1. Create batch
$batch = @{ projectId = "uuid"; name = "test"; priority = 5 } | ConvertTo-Json
$result = Invoke-RestMethod "http://localhost:3004/api/v1/batches" -Method Post -Body $batch -ContentType "application/json"

# 2. Scan directory
$scan = @{ autoAssign = $true; assignmentMethod = "AUTO_ROUND_ROBIN" } | ConvertTo-Json
$tasks = Invoke-RestMethod "http://localhost:3004/api/v1/batches/$($result.id)/scan-directory" -Method Post -Body $scan -ContentType "application/json"

# 3. View results
$tasks | ConvertTo-Json -Depth 3
```

---

## 🔧 Common Commands

### Check Service Status
```powershell
docker compose ps project-management
```

### Rebuild & Restart
```powershell
docker compose build project-management
docker compose up -d project-management
```

### Check Environment Variable
```powershell
docker compose exec project-management printenv | grep ENABLE_DIRECTORY_SCAN
# Should show: ENABLE_DIRECTORY_SCAN=true
```

### View Logs
```powershell
docker compose logs -f --tail=50 project-management
```

### List Files in Batch Folder
```powershell
$projectId = "uuid"
$batchName = "test"
Get-ChildItem "../welo-platform-ui/public/uploads/$projectId/$batchName/"
```

### Regenerate Frontend API Clients
**After modifying scan-directory endpoint or any backend API:**
```powershell
cd ../welo-platform-ui
npm run generate:api
```
This ensures TypeScript catches API changes at compile time.

---

## ⚙️ Configuration

### Enable Directory Scan (docker-compose.yml)
```yaml
project-management:
  environment:
    ENABLE_DIRECTORY_SCAN: "true"  # ← Must be string "true"
  volumes:
    - ../welo-platform-ui/public/uploads:/app/media  # ← Read-write (no :ro)
```

After changing, restart:
```powershell
docker compose restart project-management
```

---

## 🎯 Supported File Types

| Extension | Type | MIME Type |
|-----------|------|-----------|
| `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp` | IMAGE | `image/jpeg`, etc. |
| `.mp4`, `.avi`, `.mov`, `.mkv` | VIDEO | `video/mp4`, etc. |
| `.mp3`, `.wav`, `.ogg`, `.m4a` | AUDIO | `audio/mpeg`, etc. |
| `.pdf`, `.txt`, `.csv`, `.json` | DOCUMENT | `application/pdf`, etc. |

---

## ❌ Troubleshooting

| Error | Fix |
|-------|-----|
| **"Directory scan disabled"** | Set `ENABLE_DIRECTORY_SCAN: "true"` in docker-compose.yml |
| **"Directory not found"** | Check folder path and batch name match exactly |
| **"No files found"** | Add files to folder or check file pattern |
| **404 when loading file** | Check media endpoint URL and volume mount |
| **"Batch not found"** | Create batch first, then scan |

### Debug Checklist
- [ ] `ENABLE_DIRECTORY_SCAN=true` verified
- [ ] Folder exists: `../welo-platform-ui/public/uploads/{projectId}/{batchName}/`
- [ ] Files present in folder
- [ ] Batch name in UI matches folder name exactly
- [ ] Project ID in UI matches folder structure
- [ ] Service running: `docker compose ps project-management`

---

## 📖 API Reference

### Scan Directory Endpoint
```http
POST /api/v1/batches/:id/scan-directory
Content-Type: application/json

{
  "directoryPath": "optional-custom-path",  // Default: {projectId}/{batchName}
  "filePattern": "*.jpg",                   // Optional: Filter files
  "taskType": "ANNOTATION",
  "autoAssign": true,
  "assignmentMethod": "AUTO_ROUND_ROBIN"
}
```

**Response:**
```json
{
  "tasks": [ {...}, {...} ],
  "scannedFiles": 10,
  "createdTasks": 10,
  "errors": []
}
```

### Media File Endpoint
```http
GET /api/v1/media/:projectId/:batchName/:filename
```

---

## 🔄 Workflow Diagram

```
1. Manual Setup
   └─ Create folder: public/uploads/{projectId}/{batchName}/
   └─ Place files in folder

2. UI Interaction
   └─ Select "Scan Directory" mode
   └─ Choose project & enter batch name
   └─ Click "Scan Directory & Create Tasks"

3. Backend Processing
   └─ Verify ENABLE_DIRECTORY_SCAN=true
   └─ Scan: /app/media/{projectId}/{batchName}/
   └─ Detect file types by extension
   └─ Create tasks with URLs
   └─ Auto-assign (if enabled)

4. Result
   └─ Tasks created
   └─ Batch updated
   └─ Ready for annotation
```

---

## 📚 Full Documentation

- **Implementation Details:** See `DIRECTORY_SCAN_IMPLEMENTATION.md`
- **Testing Script:** `scripts/test-directory-scan.ps1`
- **Feature Plan:** `docs/features/batch-upload-file-handling-fix.md`
- **Development Workflow:** `DEVELOPMENT_WORKFLOW.md`

---

## 🎬 Demo Script

**Perfect for showing stakeholders:**

```powershell
# 1. Setup (30 seconds)
$projectId = "demo-project-uuid"
mkdir "../welo-platform-ui/public/uploads/$projectId/demo_batch"
cp sample_images/* "../welo-platform-ui/public/uploads/$projectId/demo_batch/"

# 2. UI Demo (1 minute)
# - Open: http://localhost:5173/ops/batch-upload
# - Select: Scan Directory mode
# - Show: Folder structure instructions
# - Enter: Project + batch name
# - Click: Scan Directory
# - Show: Progress indicator
# - Navigate: To batch details

# 3. Verify (30 seconds)
# - Show: Task count matches file count
# - Open: Task in annotator
# - Show: File loads correctly
```

**Talking Points:**
- "No upload required - files already in folder"
- "Automatic task generation from directory"
- "One-click batch creation"
- "Switch between demo and production modes"
