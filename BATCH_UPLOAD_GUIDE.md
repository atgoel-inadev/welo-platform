# Batch Upload Functionality - Implementation Summary

## Overview
The Batch Upload functionality has been fully implemented to allow project managers to:
1. Upload CSV files with file metadata
2. Browse and select local files directly
3. Convert files into annotation tasks assigned to annotators
4. Serve media files through the backend API

## Architecture

### Volume Mount
- **Frontend**: `welo-platform-ui/public/uploads/`
- **Backend**: `/app/media` (read-only mount in project-management service)
- This allows the backend to serve files that are placed in the UI's public uploads directory

### Components

#### 1. Media Controller (`apps/project-management/src/controllers/media.controller.ts`)
- **Endpoint**: `GET /api/v1/media/:filename`
- **Purpose**: Serves media files with proper content types
- **Security**: Prevents directory traversal attacks
- **Supported Types**: Images, videos, audio, PDFs, text files, CSVs, JSON

#### 2. Batch Upload UI (`welo-platform-ui/src/pages/ops/BatchUpload.tsx`)
Enhanced with three upload methods:
- **CSV Upload**: Parse CSV file with metadata
- **Browse Local Files**: Select files from file system (multi-select)
- **Manual Entry**: Add files manually one by one

#### 3. File URL Format
All files must reference the backend media endpoint:
```
http://localhost:3004/api/v1/media/{filename}
```

## How to Use

### Method 1: Quick Demo with Pre-configured CSV
1. Navigate to **Ops Dashboard** → **Upload Batch**
2. Click **"Choose CSV File"**
3. Select `public/uploads/demo-batch.csv`
4. The CSV contains references to sample files already in the uploads folder
5. Configure batch settings:
   - Select a project
   - Enter batch name
   - Set priority
   - Choose assignment method
6. Click **"Create Batch & Upload Files"**

### Method 2: Browse Local Files
1. Navigate to **Ops Dashboard** → **Upload Batch**
2. Click **"Choose Files"** under "Browse Local Files"
3. Select one or multiple files from your computer
4. Files will be processed and URLs auto-generated
5. Configure batch and submit

### Method 3: Custom CSV
Create a CSV with the following format:
```csv
file_name,file_type,file_url,external_id
my_image.jpg,IMAGE,http://localhost:3004/api/v1/media/my_image.jpg,img_001
my_doc.pdf,PDF,http://localhost:3004/api/v1/media/my_doc.pdf,doc_001
```

**Important**: Before using the CSV:
1. Copy your files to `welo-platform-ui/public/uploads/`
2. Update the CSV with the correct filenames
3. Upload the CSV

## Supported File Types

| Extension | File Type | Content Type |
|-----------|-----------|-------------|
| .jpg, .jpeg, .png, .gif, .webp | IMAGE | image/* |
| .mp4, .webm | VIDEO | video/* |
| .mp3, .wav | AUDIO | audio/* |
| .pdf | PDF | application/pdf |
| .txt | TEXT | text/plain |
| .csv | CSV | text/csv |
| .json | JSON | application/json |

## Configuration

### Docker Volume Mount
```yaml
project-management:
  volumes:
    - ../welo-platform-ui/public/uploads:/app/media:ro
  environment:
    MEDIA_FILES_PATH: /app/media
```

### Auto-Assignment
When creating a batch, you can enable auto-assignment with one of three methods:
- **Round Robin**: Distributes tasks evenly across annotators
- **Workload Based**: Assigns to annotators with fewer active tasks
- **Skill Based**: Matches tasks to annotators based on skills (requires skill config)

## Task Creation Flow

1. **Batch Creation**
   - Create batch record in database
   - Set priority, due date, and configuration

2. **File Allocation**
   - For each file in CSV/selection:
     - Create Task entity
     - Set file URL, type, and metadata
     - Link to batch and project
     - Initialize workflow state (QUEUED)

3. **Auto-Assignment** (if enabled)
   - Query available annotators from project team
   - Apply assignment algorithm
   - Create Assignment records
   - Update task status to ASSIGNED

4. **Notification**
   - Publish Kafka events
   - Notify assigned annotators
   - Update batch statistics

## Demo Files Included

The following sample files are pre-loaded in `public/uploads/`:
- `sample_image1.jpg` - Sample image for annotation
- `sample_image2.jpg` - Sample image for annotation
- `sample_image3.jpg` - Sample image for annotation
- `sample_text1.txt` - Sample text file
- `sample_text2.txt` - Sample text file
- `sample_data.csv` - Sample CSV data
- `demo-batch.csv` - Pre-configured batch CSV

## Testing

### Test Media Endpoint
```bash
curl http://localhost:3004/api/v1/media/sample_image1.jpg
```

### Test Batch Upload
1. Login as Project Manager (pm1@welo.com / pm1234)
2. Create a project if none exists
3. Assign annotators to the project
4. Upload a batch using `demo-batch.csv`
5. Verify tasks are created and assigned

## Security Considerations

1. **Path Traversal Protection**: `path.basename()` prevents directory traversal
2. **Read-Only Mount**: Backend has read-only access to files
3. **Content Type Validation**: Only known file types are served
4. **File Existence Check**: Returns 404 for non-existent files

## Production Deployment

For production, replace the local volume mount with:
- S3/Cloud Storage integration
- CDN for media delivery
- Proper file upload endpoint with validation
- Virus scanning and file size limits
- Authentication/authorization for media access

## API Endpoints

### Batch Management
- `POST /api/v1/batches` - Create batch
- `POST /api/v1/batches/:id/allocate-files` - Allocate files to batch
- `POST /api/v1/batches/:id/auto-assign` - Auto-assign tasks
- `GET /api/v1/batches/:id/statistics` - Get batch statistics

### Media Serving
- `GET /api/v1/media/:filename` - Serve media file

## Troubleshooting

### Files Not Loading
- Verify files exist in `welo-platform-ui/public/uploads/`
- Check file URLs use `localhost:3004` not `localhost:5173`
- Ensure project-management service is running

### Auto-Assignment Fails
- Verify project has team members assigned
- Check annotators have ANNOTATOR role
- Ensure workflow is configured for the project

### Volume Mount Issues
- Restart Docker Compose: `docker compose down && docker compose up -d`
- Verify volume path in docker-compose.yml
- Check file permissions

