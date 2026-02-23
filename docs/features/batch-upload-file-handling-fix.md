# Feature: Batch Upload File Handling Fix

> **Purpose:** Fix the drift between BATCH_SERVICE.md requirements and actual implementation to enable proper file uploads for demo

**Created:** February 23, 2026  
**Status:** 🔄 Planning

---

## Overview

**Problem:** BATCH_SERVICE.md describes correct requirements, but implementation has drifted. Files cannot be properly uploaded and rendered to annotators.

**Current Issues:**
1. ❌ Frontend `copyFileToUploads()` is placeholder - doesn't actually upload files
2. ❌ No backend file upload endpoint exists
3. ❌ Volume mount is read-only (`:ro`) - backend cannot write
4. ❌ No project-wise folder organization (`/media/{projectId}/`)
5. ❌ CSV method requires manual file placement in `public/uploads/`

**End Goal:** Annotators can see rendered files (images, videos, PDFs) when answering annotation questions.

---

## Requirements

- [x] Batch creation uploads files to backend
- [x] Files organized by project: `/media/{projectId}/{filename}`
- [x] Backend file upload endpoint with multipart/form-data support
- [x] Volume mount allows write access
- [x] CSV upload extracts and uploads referenced files
- [x] Browse files uploads selected files
- [x] Task file URLs point to uploaded files
- [x] Annotation UI can render files from media endpoint

---

## Current Architecture

### Volume Mount (docker-compose.yml)
```yaml
project-management:
  volumes:
    - ../welo-platform-ui/public/uploads:/app/media:ro  # ❌ Read-only!
  environment:
    MEDIA_FILES_PATH: /app/media
```

### Media Serving (WORKING ✅)
```
GET /api/v1/media/:filename
```
- Serves files from `/app/media`
- Proper content types
- Security: prevents directory traversal

### Batch Upload Flow (BROKEN ❌)
1. Frontend: Select files → Construct URL (no actual upload)
2. Backend: Create batch → Create tasks with file URLs
3. ❌ Files don't exist at URLs
4. ❌ Annotator UI renders 404

---

## Proposed Solution

### Phase 1: Backend File Upload Endpoint

**New Endpoint:** `POST /api/v1/media/upload`

**Request:**
```typescript
Content-Type: multipart/form-data

{
  files: File[],           // Multiple files
  projectId: string        // For folder organization
}
```

**Response:**
```typescript
interface UploadedFile {
  originalName: string;
  fileName: string;         // Sanitized name
  fileUrl: string;          // Full backend URL
  fileSize: number;
  mimeType: string;
  projectId: string;
  uploadedAt: string;
}

interface UploadResponse {
  files: UploadedFile[];
  projectId: string;
  uploadPath: string;       // e.g., /media/project-123/
}
```

**Implementation:**
- Use NestJS `@UseInterceptors(FilesInterceptor())`
- Install `multer` for file handling
- Save to: `/app/media/{projectId}/{sanitized-filename}`
- Return URLs: `http://localhost:3004/api/v1/media/{projectId}/{filename}`

---

### Phase 2: Update Media Controller for Project Folders

**Current:** `GET /media/:filename`  
**New:** `GET /media/:projectId/:filename` (backward compatible with flat structure)

**Changes:**
- Support both `/media/file.jpg` (legacy) and `/media/project-123/file.jpg`
- Path construction: `path.join(mediaPath, projectId || '', filename)`
- Security: Validate projectId is UUID, prevent traversal

---

### Phase 3: Update Volume Mount

**docker-compose.yml Change:**
```yaml
project-management:
  volumes:
    - ../welo-platform-ui/public/uploads:/app/media:rw  # ✅ Read-write
    # OR for production-ready:
    - project-media:/app/media  # Named volume
```

**Production Alternative:**
```yaml
volumes:
  project-media:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /path/to/persistent/storage
```

---

### Phase 4: Frontend Upload Implementation

**Update BatchUpload.tsx:**

#### 4.1 Browse Files
```typescript
const handleBrowseFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  
  if (!projectId) {
    setErrorMessage('Please select a project first');
    return;
  }

  setUploadStep('uploading');
  setUploadProgress(10);

  try {
    // Upload files to backend
    const uploaded = await projectService.uploadFiles(projectId, Array.from(files));
    
    // Convert to ParsedFile format
    const newFiles: ParsedFile[] = uploaded.files.map(file => ({
      externalId: `file_${Date.now()}_${Math.random()}`,
      fileUrl: file.fileUrl,
      fileType: detectFileType(file.mimeType),
      fileName: file.originalName,
      fileSize: file.fileSize,
      status: 'valid',
    }));

    setParsedFiles([...parsedFiles, ...newFiles]);
    setUploadStep('preview');
  } catch (error: any) {
    setErrorMessage('File upload failed: ' + error.message);
    setUploadStep('error');
  }
};
```

#### 4.2 CSV Upload with File Extraction
```typescript
const parseCSV = async (file: File) => {
  Papa.parse<CSVRow>(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      // Check if CSV references local files
      const localFileRefs = results.data.filter(row => 
        row.file_url?.startsWith('file://') || 
        !row.file_url?.startsWith('http')
      );

      if (localFileRefs.length > 0) {
        // Warn user to provide files
        setErrorMessage(
          `CSV references ${localFileRefs.length} local files. ` +
          `Please ensure files are in public/uploads/ or upload will fail.`
        );
      }

      // For demo: Construct proper URLs
      const files: ParsedFile[] = results.data.map((row, index) => ({
        externalId: row.external_id || `file_${index + 1}`,
        fileUrl: row.file_url.startsWith('http') 
          ? row.file_url 
          : `http://localhost:3004/api/v1/media/${projectId}/${row.file_name}`,
        fileType: row.file_type?.toUpperCase() || 'TEXT',
        fileName: row.file_name,
        fileSize: 0,
        status: 'valid',
      }));

      setParsedFiles(files);
      setUploadStep('preview');
    },
  });
};
```

---

### Phase 5: Create projectService.uploadFiles()

**File:** `welo-platform-ui/src/services/projectService.ts`

```typescript
export const uploadFiles = async (
  projectId: string, 
  files: File[]
): Promise<UploadResponse> => {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append('files', file);
  });
  
  formData.append('projectId', projectId);
  
  const response = await projectManagementApi.post<UploadResponse>(
    '/media/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  
  return response;
};
```

---

## API Contracts

### POST /api/v1/media/upload

**Request:**
```
Content-Type: multipart/form-data

FormData:
  files: File[]
  projectId: string (UUID)
```

**Response (200 OK):**
```json
{
  "files": [
    {
      "originalName": "my-image.jpg",
      "fileName": "my-image-1234567890.jpg",
      "fileUrl": "http://localhost:3004/api/v1/media/project-uuid/my-image-1234567890.jpg",
      "fileSize": 245678,
      "mimeType": "image/jpeg",
      "projectId": "project-uuid",
      "uploadedAt": "2026-02-23T12:34:56.789Z"
    }
  ],
  "projectId": "project-uuid",
  "uploadPath": "/media/project-uuid/"
}
```

**Error Cases:**
- `400 Bad Request`: No files provided, invalid projectId
- `404 Not Found`: Project not found
- `413 Payload Too Large`: File size exceeds limit
- `415 Unsupported Media Type`: File type not allowed

---

### GET /api/v1/media/:projectId/:filename (Enhanced)

**Backward Compatible:**
- `GET /media/file.jpg` → Serves from `/app/media/file.jpg`
- `GET /media/project-123/file.jpg` → Serves from `/app/media/project-123/file.jpg`

**Response:**
- Content-Type based on file extension
- Content-Disposition: inline
- Streamed response

---

## Database Changes

**No schema changes required** - file metadata already in Task entity:
```typescript
{
  fileUrl: string;
  fileType: string;
  fileMetadata: {
    fileName: string;
    fileSize: number;
    mimeType?: string;
  }
}
```

---

## Implementation Plan

### Phase 1: Backend File Upload (60 min)

- [ ] Install dependencies: `@nestjs/platform-express multer @types/multer`
- [ ] Create `UploadedFileDto` response DTO
- [ ] Add `uploadFiles()` method to MediaController
- [ ] Configure multer storage (disk storage with project folders)
- [ ] Add file validation (size, type)
- [ ] Add Swagger documentation

**Files to modify:**
- `apps/project-management/package.json` (add deps)
- `apps/project-management/src/controllers/media.controller.ts`
- `apps/project-management/src/dto/upload-file.dto.ts` (new)

---

### Phase 2: Enhanced Media Serving (20 min)

- [ ] Update `getMediaFile()` to support project folders
- [ ] Add path validation for projectId parameter
- [ ] Test backward compatibility

**Files to modify:**
- `apps/project-management/src/controllers/media.controller.ts`

---

### Phase 3: Update Docker Volume (5 min)

- [ ] Change `:ro` to `:rw` in docker-compose.yml
- [ ] Restart project-management service
- [ ] Test write permissions

**Files to modify:**
- `docker-compose.yml`

**Commands:**
```bash
docker compose build project-management
docker compose up -d project-management
```

---

### Phase 4: Frontend Upload Service (30 min)

- [ ] Create `uploadFiles()` in projectService
- [ ] Update BatchUpload.tsx `handleBrowseFiles()`
- [ ] Add upload progress tracking
- [ ] Handle upload errors

**Files to modify:**
- `welo-platform-ui/src/services/projectService.ts`
- `welo-platform-ui/src/pages/ops/BatchUpload.tsx`

---

### Phase 5: Integration Testing (30 min)

**Test Scenario 1: Browse and Upload**
1. Select project
2. Click "Choose Files"
3. Select multiple images
4. Verify files upload
5. Create batch
6. Verify tasks created with correct URLs
7. Open annotation UI
8. Verify files render

**Test Scenario 2: CSV Upload**
1. Create CSV with file references
2. Place files in `public/uploads/`
3. Upload CSV
4. Verify tasks reference correct URLs
5. Test file rendering

**Test Commands:**
```powershell
# Test file upload
$files = @("c:\path\to\image1.jpg", "c:\path\to\image2.jpg")
# ... PowerShell multipart upload test

# Test media endpoint
Invoke-RestMethod "http://localhost:3004/api/v1/media/project-id/image.jpg" -OutFile test.jpg
```

---

## Testing Scripts

### Test Backend Upload

```powershell
# Upload files to project
$projectId = "your-project-uuid"
$filePath1 = "C:\path\to\image1.jpg"
$filePath2 = "C:\path\to\image2.jpg"

$form = @{
  files = Get-Item $filePath1, $filePath2
  projectId = $projectId
}

$response = Invoke-RestMethod -Uri "http://localhost:3004/api/v1/media/upload" `
  -Method Post -Form $form

$response | ConvertTo-Json -Depth 5
```

### Test File Serving

```powershell
# Get uploaded file
$projectId = "your-project-uuid"
$fileName = "image-123456.jpg"

Invoke-RestMethod -Uri "http://localhost:3004/api/v1/media/$projectId/$fileName" `
  -OutFile "downloaded.jpg"

# Verify file
if (Test-Path "downloaded.jpg") {
  Write-Host "✅ File downloaded successfully"
  ii downloaded.jpg  # Open file
}
```

---

## Rollback Plan

1. **Revert Docker volume:**
   ```bash
   # Restore read-only mode
   # Edit docker-compose.yml: :rw → :ro
   docker compose restart project-management
   ```

2. **Revert code changes:**
   ```bash
   git revert <commit-hash>
   docker compose build project-management
   docker compose up -d project-management
   ```

3. **Clear test files:**
   ```bash
   rm -rf welo-platform-ui/public/uploads/*
   ```

---

## Success Criteria

- [ ] Files upload via "Browse Files" button
- [ ] Uploaded files stored in project-specific folders
- [ ] Media endpoint serves files from project folders
- [ ] Batch creation uses uploaded file URLs
- [ ] Tasks created with correct file references
- [ ] Annotation UI renders images/videos/PDFs correctly
- [ ] No manual file placement required
- [ ] Demo-ready workflow end-to-end

---

## Timeline

| Phase | Task | Estimated | Actual |
|-------|------|-----------|--------|
| 1 | Backend upload endpoint | 60 min | |
| 2 | Enhanced media serving | 20 min | |
| 3 | Docker volume update | 5 min | |
| 4 | Frontend upload service | 30 min | |
| 5 | Integration testing | 30 min | |
| **Total** | | **145 min (~2.5 hours)** | |

---

## Notes

**For Demo:**
- Pre-populate `public/uploads/` with sample files
- Create test project with annotators assigned
- Prepare sample CSV (optional)
- Test full flow before demo

**Production Considerations:**
- File size limits (default 50MB)
- Allowed file types validation
- Virus scanning
- CDN integration
- S3/cloud storage migration path
- File cleanup (orphaned files)

---

**Status:** Ready for implementation  
**Next Step:** Implement Phase 1 - Backend File Upload Endpoint
