# Welo Data Annotation Platform - API Specification

## Overview
RESTful API specification for the Welo Data Annotation Platform. The platform is a **microservices monorepo** — each service runs independently with its own port. All services use the prefix `/api/v1` and accept/return JSON.

**Authentication**: Bearer token (JWT) in Authorization header
```
Authorization: Bearer <access_token>
```

---

## Microservice Base URLs

| Service | Default Port | Base URL |
|---------|-------------|----------|
| Workflow Engine | 3001 | `http://localhost:3001/api/v1` |
| Auth Service | 3002 | `http://localhost:3002/api/v1` |
| Task Management | 3003 | `http://localhost:3003/api/v1` |
| Project Management | 3004 | `http://localhost:3004/api/v1` |
| Annotation QA Service | 3005 | `http://localhost:3005/api/v1` |

In production, all services sit behind a reverse proxy/API gateway at a unified domain. Swagger UI is available at `http://localhost:{port}/api` for each service.

---

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "2026-02-03T10:30:00Z",
    "request_id": "uuid"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  },
  "metadata": {
    "timestamp": "2026-02-03T10:30:00Z",
    "request_id": "uuid"
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "page_size": 50,
    "total_items": 235,
    "total_pages": 5,
    "has_next": true,
    "has_previous": false
  }
}
```

---

## 1. Authentication & User Management
**Service**: Auth Service (port 3002)
**Tag**: `auth`, `users`

### 1.1 Login
```
POST /auth/login
```

**Request:**
```json
{
  "email": "admin@welo.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...refresh",
    "expiresIn": 3600,
    "user": {
      "id": "uuid",
      "email": "admin@welo.com",
      "name": "John Admin",
      "role": "ADMIN",
      "permissions": ["*"],
      "status": "ACTIVE",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  },
  "message": "Login successful"
}
```

### 1.2 Register
```
POST /auth/register
```

**Request:**
```json
{
  "email": "user@welo.com",
  "password": "password123",
  "name": "John Doe",
  "role": "ANNOTATOR"
}
```

### 1.3 Refresh Token
```
POST /auth/refresh
```

**Request:**
```json
{
  "refreshToken": "eyJhbGci...refresh"
}
```

### 1.4 Logout
```
POST /auth/logout
```
*Requires: Bearer token*

### 1.5 Get Current User
```
GET /auth/me
```
*Requires: Bearer token*

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@welo.com",
    "name": "John Admin",
    "role": "ADMIN",
    "permissions": ["*"],
    "status": "ACTIVE",
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### 1.6 Update Profile
```
PATCH /auth/profile
```
*Requires: Bearer token*

**Request:**
```json
{
  "name": "Jane Doe",
  "email": "jane@welo.com"
}
```

### 1.7 Change Password
```
PATCH /auth/password
```
*Requires: Bearer token*

**Request:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePass456"
}
```

### 1.8 Validate Session
```
GET /auth/session
```
*Requires: Bearer token*

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": { ... }
  }
}
```

### 1.9 List Users
```
GET /auth/users?role=ANNOTATOR&status=ACTIVE&search=john&page=1&limit=50
```
*Requires: Bearer token*

**Query Parameters:**
- `role` (optional): ADMIN, PROJECT_MANAGER, ANNOTATOR, REVIEWER, QA, CUSTOMER
- `status` (optional): ACTIVE, INACTIVE, SUSPENDED
- `search` (optional): Search by name or email
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "email": "annotator@welo.com",
        "name": "Jane Doe",
        "role": "ANNOTATOR",
        "permissions": ["task.read", "task.claim", "task.submit"],
        "status": "ACTIVE",
        "createdAt": "2025-01-10T08:00:00.000Z"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 50
  }
}
```

### 1.10 Get User by ID
```
GET /auth/users/{id}
```

### 1.11 Create User (Admin)
```
POST /auth/users
```

**Request:**
```json
{
  "email": "user@welo.com",
  "password": "password123",
  "name": "John Doe",
  "role": "ANNOTATOR",
  "status": "ACTIVE"
}
```

### 1.12 Update User
```
PATCH /auth/users/{id}
```

**Request:**
```json
{
  "name": "Updated Name",
  "role": "REVIEWER",
  "status": "ACTIVE"
}
```

### 1.13 Delete User
```
DELETE /auth/users/{id}
```

---

## 2. Projects
**Service**: Project Management (port 3004)
**Tag**: `projects`

### 2.1 List Projects
```
GET /projects?customerId=uuid&status=ACTIVE&page=1&pageSize=50
```

**Query Parameters:**
- `customerId` (optional): Filter by customer
- `status` (optional): DRAFT, ACTIVE, PAUSED, COMPLETED, ARCHIVED
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 50)

### 2.2 Get Project
```
GET /projects/{id}
```

### 2.3 Create Project
```
POST /projects
```

**Request:**
```json
{
  "name": "Medical Image Annotation",
  "customerId": "uuid",
  "description": "Annotate medical scans for tumor detection",
  "projectType": "IMAGE",
  "configuration": {
    "annotationSchema": {},
    "qualityThresholds": { "minimumScore": 85 },
    "workflowRules": {},
    "uiConfiguration": {}
  },
  "startDate": "2026-02-10",
  "endDate": "2026-06-30"
}
```

### 2.4 Update Project
```
PATCH /projects/{id}
```

### 2.5 Update Project Status
```
PATCH /projects/{id}/status
```

**Request:**
```json
{ "status": "ACTIVE" }
```

### 2.6 Delete Project (soft)
```
DELETE /projects/{id}
```

### 2.7 Clone Project
```
POST /projects/{id}/clone
```

**Request:**
```json
{ "newName": "Cloned Project", "copyTasks": false }
```

### 2.8 Get Project Statistics
```
GET /projects/{id}/statistics
```

**Response:**
```json
{
  "totalBatches": 15,
  "totalTasks": 5000,
  "completedTasks": 3200,
  "inProgressTasks": 800,
  "averageQualityScore": 92.5
}
```

---

## 3. Project — Annotation Questions
**Service**: Project Management (port 3004)

### 3.1 Add Annotation Questions
```
POST /projects/{id}/annotation-questions
```

**Request:**
```json
{
  "questions": [
    {
      "id": "q1",
      "question": "What is the sentiment?",
      "questionType": "SINGLE_SELECT",
      "required": true,
      "options": [
        { "id": "o1", "label": "Positive", "value": "positive" },
        { "id": "o2", "label": "Negative", "value": "negative" }
      ]
    }
  ]
}
```

### 3.2 Get Annotation Questions
```
GET /projects/{id}/annotation-questions
```

### 3.3 Update Annotation Question
```
PATCH /projects/{id}/annotation-questions/{questionId}
```

### 3.4 Delete Annotation Question
```
DELETE /projects/{id}/annotation-questions/{questionId}
```

---

## 4. Project — Workflow Configuration
**Service**: Project Management (port 3004)

### 4.1 Configure Workflow
```
POST /projects/{id}/workflow-configuration
```

**Request:**
```json
{
  "annotatorsPerTask": 2,
  "reviewLevels": [
    {
      "level": 1,
      "name": "Senior Review",
      "reviewersCount": 1,
      "requireAllApprovals": true,
      "autoAssign": false
    }
  ],
  "approvalCriteria": {
    "requireAllAnnotatorConsensus": false,
    "qualityScoreMinimum": 80
  },
  "assignmentRules": {
    "allowSelfAssignment": false,
    "preventDuplicateAssignments": true,
    "assignmentTimeout": 480
  }
}
```

### 4.2 Get Workflow Configuration
```
GET /projects/{id}/workflow-configuration
```

### 4.3 Update Annotators per Task
```
PATCH /projects/{id}/workflow-configuration/annotators-per-task
```

**Request:** `{ "count": 3 }`

### 4.4 Add Review Level
```
POST /projects/{id}/workflow-configuration/review-levels
```

### 4.5 Remove Review Level
```
DELETE /projects/{id}/workflow-configuration/review-levels/{level}
```

---

## 5. Project — Team Management
**Service**: Project Management (port 3004)

### 5.1 Get Project Team
```
GET /projects/{id}/team
```

### 5.2 Assign User to Project
```
POST /projects/{id}/team
```

**Request:**
```json
{
  "userId": "uuid",
  "role": "ANNOTATOR",
  "quota": 50
}
```

### 5.3 Update Team Member
```
PATCH /projects/{id}/team/{userId}
```

**Request:**
```json
{ "quota": 75, "isActive": true }
```

### 5.4 Remove User from Project
```
DELETE /projects/{id}/team/{userId}
```

---

## 6. Project — Plugins
**Service**: Project Management (port 3004)

### 6.1 List Plugins
```
GET /projects/{id}/plugins
```

### 6.2 Create Plugin
```
POST /projects/{id}/plugins
```

**Request:**
```json
{
  "name": "Profanity Filter",
  "type": "API",
  "trigger": "ON_BLUR",
  "onFailBehavior": "SOFT_WARN",
  "questionBindings": ["q1"],
  "apiConfig": {
    "url": "https://api.example.com/check",
    "method": "POST",
    "headers": { "Content-Type": "application/json" },
    "responseMapping": { "resultPath": "$.result" },
    "timeout": 5000,
    "retries": 2
  }
}
```

### 6.3 Update Plugin
```
PATCH /projects/{id}/plugins/{pluginId}
```

### 6.4 Delete Plugin
```
DELETE /projects/{id}/plugins/{pluginId}
```

### 6.5 Deploy Plugin
```
POST /projects/{id}/plugins/{pluginId}/deploy
```

### 6.6 Toggle Plugin
```
POST /projects/{id}/plugins/{pluginId}/toggle
```

**Request:** `{ "enabled": true }`

---

## 7. Project — Secrets
**Service**: Project Management (port 3004)

### 7.1 List Secrets (values masked)
```
GET /projects/{id}/secrets
```

### 7.2 Create Secret
```
POST /projects/{id}/secrets
```

**Request:**
```json
{
  "name": "API_KEY",
  "value": "sk-...",
  "description": "External validation API key"
}
```

### 7.3 Delete Secret
```
DELETE /projects/{id}/secrets/{name}
```

---

## 8. Project — Supported File Types
**Service**: Project Management (port 3004)

### 8.1 Set Supported File Types
```
POST /projects/{id}/supported-file-types
```

**Request:**
```json
{ "fileTypes": ["CSV", "IMAGE", "PDF"] }
```

### 8.2 Get Supported File Types
```
GET /projects/{id}/supported-file-types
```

---

## 9. Project — UI Configurations
**Service**: Project Management (port 3004)
**Tag**: `ui-configurations`

### 9.1 Create / Update UI Configuration
```
POST /projects/{projectId}/ui-configurations
```

### 9.2 Get UI Configuration
```
GET /projects/{projectId}/ui-configurations
```

### 9.3 Update UI Configuration
```
PUT /projects/{projectId}/ui-configurations
```

### 9.4 Get Configuration Versions
```
GET /projects/{projectId}/ui-configurations/versions
```

### 9.5 Get Specific Version
```
GET /projects/{projectId}/ui-configurations/versions/{version}
```

### 9.6 Rollback to Version
```
POST /projects/{projectId}/ui-configurations/versions/{version}/rollback
```

### 9.7 Delete UI Configuration
```
DELETE /projects/{projectId}/ui-configurations
```

### 9.8 Get View-Specific Configuration
```
GET /projects/{projectId}/ui-configurations/view/{viewType}
```

`viewType`: `annotator` or `reviewer`

---

## 10. Batches
**Service**: Project Management (port 3004) — full batch lifecycle management
**Service**: Task Management (port 3003) — batch read/stats (read-only mirror)
**Tag**: `batches`

### 10.1 List Batches
```
GET /batches?projectId=uuid
```

### 10.2 Get Batch
```
GET /batches/{id}
```

### 10.3 Create Batch
```
POST /batches
```

**Request:**
```json
{
  "projectId": "uuid",
  "name": "Batch 001",
  "description": "First batch of tasks",
  "priority": 7
}
```

### 10.4 Update Batch
```
PATCH /batches/{id}
```

### 10.5 Batch Statistics
```
GET /batches/{id}/statistics
```

**Response:**
```json
{
  "batchId": "uuid",
  "batchName": "Batch 001",
  "totalTasks": 500,
  "completedTasks": 320,
  "inProgressTasks": 80,
  "queuedTasks": 100,
  "rejectedTasks": 5,
  "skippedTasks": 2,
  "averageCompletionTime": 185.4,
  "completionPercentage": 64
}
```

### 10.6 Complete Batch
```
POST /batches/{id}/complete
```

### 10.7 Allocate Files to Batch
```
POST /batches/{id}/allocate-files
```

**Request:**
```json
{
  "files": [
    { "url": "https://storage.example.com/file1.csv", "fileName": "file1.csv", "fileType": "CSV" },
    { "url": "https://storage.example.com/img1.jpg", "fileName": "img1.jpg", "fileType": "IMAGE" }
  ]
}
```

**Response:**
```json
{
  "createdCount": 2,
  "taskIds": ["uuid1", "uuid2"]
}
```

### 10.8 Allocate Folder to Batch
```
POST /batches/{id}/allocate-folder
```

**Request:**
```json
{
  "folderPath": "/data/project-123/batch-001/"
}
```

### 10.9 Scan Directory and Create Tasks (Demo Mode)
```
POST /batches/{id}/scan-directory
```

Scans `/media/{projectId}/{batchName}/` and creates tasks for all files found.

### 10.10 Auto-Assign Tasks in Batch
```
POST /batches/{id}/auto-assign
```

**Request:**
```json
{ "assignmentMethod": "AUTO_ROUND_ROBIN" }
```

`assignmentMethod`: `AUTO_ROUND_ROBIN` | `AUTO_WORKLOAD_BASED` | `AUTO_SKILL_BASED`

### 10.11 Assign Task (from Batch context)
```
POST /batches/assign-task
```

**Request:**
```json
{
  "taskId": "uuid",
  "userId": "uuid",
  "workflowStage": "ANNOTATION"
}
```

### 10.12 Pull Next Task (from Batch queue)
```
POST /batches/pull-next-task
```

**Request:**
```json
{
  "userId": "uuid",
  "projectId": "uuid",
  "batchId": "uuid"
}
```

---

## 11. Tasks
**Service**: Task Management (port 3003)
**Tag**: `tasks`

### 11.1 List Tasks
```
GET /tasks?batchId=uuid&projectId=uuid&status=QUEUED&priority=8&assignedTo=uuid&taskType=ANNOTATION&page=1&pageSize=50&sortBy=priority&sortOrder=DESC
```

### 11.2 Get Task
```
GET /tasks/{id}
```

### 11.3 Create Task
```
POST /tasks
```

**Request:**
```json
{
  "batchId": "uuid",
  "projectId": "uuid",
  "workflowId": "uuid",
  "externalId": "file-001",
  "taskType": "ANNOTATION",
  "priority": 5,
  "fileType": "IMAGE",
  "fileUrl": "https://storage.example.com/img1.jpg",
  "fileName": "img1.jpg",
  "fileSize": 204800,
  "dataPayload": {
    "sourceData": { "text": "Sample text to annotate" },
    "references": [],
    "context": {}
  },
  "estimatedDuration": 300,
  "requiresConsensus": false
}
```

### 11.4 Create Tasks (Bulk)
```
POST /tasks/bulk
```

**Request:**
```json
{
  "tasks": [ { ...CreateTaskDto }, { ...CreateTaskDto } ]
}
```

### 11.5 Update Task
```
PATCH /tasks/{id}
```

### 11.6 Update Task Status
```
PATCH /tasks/{id}/status
```

**Request:**
```json
{
  "status": "SKIPPED",
  "reason": "Low quality source data"
}
```

### 11.7 Delete Task (soft)
```
DELETE /tasks/{id}
```

### 11.8 Assign Task
```
POST /tasks/{id}/assign
```

**Request:**
```json
{
  "userId": "uuid",
  "workflowStage": "ANNOTATION",
  "expiresIn": 28800,
  "assignmentMethod": "MANUAL"
}
```

### 11.9 Get Next Task (FIFO queue)
```
POST /tasks/next
```

**Request:**
```json
{
  "userId": "uuid",
  "projectId": "uuid",
  "taskType": "ANNOTATION"
}
```

**Response:**
```json
{
  "task": { ... },
  "assignment": { "id": "uuid", "expiresAt": "2026-02-03T18:00:00Z" }
}
```

### 11.10 Submit Task
```
POST /tasks/{id}/submit
```

**Request:**
```json
{
  "assignmentId": "uuid",
  "annotationData": { "label": "positive" },
  "confidenceScore": 0.95,
  "timeSpent": 285,
  "responses": [
    { "questionId": "q1", "response": "positive", "timeSpent": 30, "confidenceScore": 0.9 }
  ]
}
```

### 11.11 Send XState Event to Task
```
POST /tasks/{id}/events
```

**Request:**
```json
{
  "event": "SUBMIT",
  "payload": { "annotationData": { ... } }
}
```

### 11.12 Get Task Statistics
```
GET /tasks/{id}/statistics
```

**Response:**
```json
{
  "taskId": "uuid",
  "totalAnnotations": 2,
  "completedAnnotations": 2,
  "averageConfidenceScore": 0.91,
  "averageTimeSpent": 145,
  "consensusScore": 0.92,
  "consensusReached": true,
  "currentReviewLevel": 1,
  "reviewsApproved": 1,
  "reviewsRejected": 0,
  "qualityScore": 0.95
}
```

### 11.13 Bulk Task Action
```
POST /tasks/bulk-action
```

**Request:**
```json
{
  "taskIds": ["uuid1", "uuid2"],
  "action": "ASSIGN",
  "userId": "uuid",
  "reason": "Reassigning to senior annotator"
}
```

`action`: `ASSIGN` | `SKIP` | `RESET` | `ARCHIVE` | `HOLD` | `PRIORITY_CHANGE`

### 11.14 Get Task Assignments
```
GET /tasks/{id}/assignments
```

### 11.15 Reassign Task (PM)
```
POST /tasks/{id}/reassign
```

**Request:**
```json
{
  "newUserId": "uuid",
  "reason": "Original annotator unavailable",
  "workflowStage": "ANNOTATION"
}
```

### 11.16 Unassign Task (PM)
```
POST /tasks/{id}/unassign
```

Returns task to QUEUED status.

### 11.17 Get Task Render Config
```
GET /tasks/{id}/render-config?userId=uuid
```

Returns the complete configuration for rendering the task UI (file viewer + annotation questions + extra widgets).

### 11.18 Save Annotation
```
POST /tasks/{id}/annotation?userId=uuid
```

**Request:**
```json
{
  "responses": [
    { "questionId": "q1", "response": "positive", "timeSpent": 30, "confidenceScore": 0.9 }
  ],
  "extraWidgetData": {},
  "timeSpent": 120
}
```

### 11.19 Save Review
```
POST /tasks/{id}/review?userId=uuid
```

**Request:**
```json
{
  "decision": "APPROVED",
  "comments": "Good quality annotation",
  "qualityScore": 0.92,
  "extraWidgetData": {},
  "timeSpent": 90
}
```

`decision`: `APPROVED` | `REJECTED` | `NEEDS_REVISION`

### 11.20 Get Annotation History
```
GET /tasks/{id}/annotation-history
```

### 11.21 Time Analytics
```
GET /tasks/analytics/time?projectId=uuid&batchId=uuid&userId=uuid&startDate=2025-01-01&endDate=2025-12-31
```

---

## 12. Tasks — Stage-Based Workflow
**Service**: Task Management (port 3003)

### 12.1 Assign Task to Specific Stage
```
POST /tasks/{taskId}/assign-stage
```

**Request:**
```json
{
  "userId": "uuid",
  "stageId": "stage-annotation-1",
  "assignmentMethod": "MANUAL"
}
```

`assignmentMethod`: `MANUAL` | `AUTOMATIC` | `CLAIMED`

### 12.2 Get Next Task for Stage
```
GET /tasks/next-for-stage?userId=uuid&projectId=uuid&stageId=stage-annotation-1
```

### 12.3 Increment Rework Count
```
POST /tasks/{taskId}/increment-rework
```

**Request:**
```json
{
  "stageId": "stage-annotation-1",
  "reason": "Quality below threshold"
}
```

### 12.4 Check Stage Quality Gate
```
GET /tasks/{taskId}/stage-quality-check/{stageId}?qualityScore=85
```

---

## 13. Tasks — Plugin Execution
**Service**: Task Management (port 3003)

### 13.1 Test Plugin (Dry-run)
```
POST /tasks/plugins/test
```

**Request:**
```json
{
  "projectId": "uuid",
  "pluginConfig": { ... },
  "answerValue": "test value"
}
```

### 13.2 Execute Plugin for Task
```
POST /tasks/{taskId}/plugins/execute
```

**Request:**
```json
{
  "projectId": "uuid",
  "pluginId": "plugin-uuid",
  "questionId": "q1",
  "answerValue": "user input"
}
```

**Response:**
```json
{
  "result": "PASS",
  "message": "Value is valid"
}
```

---

## 14. Tasks — Comments
**Service**: Task Management (port 3003)

### 14.1 List Task Comments
```
GET /tasks/{id}/comments
```

### 14.2 Add Comment
```
POST /tasks/{id}/comments
```

**Request:**
```json
{
  "userId": "uuid",
  "content": "This annotation needs clarification on entity boundaries.",
  "parentCommentId": null
}
```

### 14.3 Resolve Comment
```
PATCH /tasks/{id}/comments/{commentId}/resolve
```

**Request:**
```json
{ "resolvedBy": "uuid" }
```

### 14.4 Delete Comment
```
DELETE /tasks/{id}/comments/{commentId}?userId=uuid
```

---

## 15. Annotations
**Service**: Annotation QA Service (port 3005)
**Tag**: `annotations`

### 15.1 Submit Annotation
```
POST /tasks/{taskId}/annotations?userId=uuid
```

**Request:**
```json
{
  "assignmentId": "uuid",
  "annotationData": {
    "labels": [{ "start": 0, "end": 10, "label": "PERSON", "text": "John Smith" }],
    "entities": [],
    "relationships": [],
    "attributes": { "sentiment": "positive" }
  },
  "confidenceScore": 0.95,
  "timeSpent": 285,
  "isDraft": false
}
```

**Response:**
```json
{
  "annotationId": "uuid",
  "taskId": "uuid",
  "status": "SUBMITTED",
  "createdAt": "2026-02-03T10:45:00Z"
}
```

### 15.2 List Annotations for Task
```
GET /tasks/{taskId}/annotations
```

### 15.3 Update Annotation
```
PATCH /annotations/{annotationId}?userId=uuid
```

### 15.4 Get Annotation Version History
```
GET /annotations/{annotationId}/history
```

### 15.5 Compare Annotations
```
POST /tasks/{taskId}/annotations/compare
```

**Request:**
```json
{
  "annotationIds": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "agreementScore": 0.87,
  "differences": [
    { "field": "labels[0].label", "annotation1": "PERSON", "annotation2": "ORGANIZATION" }
  ],
  "metrics": { "precision": 0.92, "recall": 0.89, "f1Score": 0.90 }
}
```

---

## 16. Reviews
**Service**: Annotation QA Service (port 3005)
**Tag**: `reviews`

### 16.1 Submit Review
```
POST /tasks/{taskId}/reviews?reviewerId=uuid
```

**Request:**
```json
{
  "annotationId": "uuid",
  "score": 85,
  "decision": "APPROVED",
  "feedback": "Good quality annotation overall."
}
```

`decision`: `APPROVE` | `REJECT` | `REQUEST_REVISION`

**Response:**
```json
{
  "reviewId": "uuid",
  "taskId": "uuid",
  "decision": "APPROVED",
  "newState": "APPROVED",
  "message": "Review submitted. State transition executed."
}
```

### 16.2 List Reviews for Task
```
GET /tasks/{taskId}/reviews
```

### 16.3 Get Review
```
GET /reviews/{reviewId}
```

### 16.4 Get QA Summary
```
GET /tasks/{taskId}/qa-summary
```

Returns full QA summary: auto QC + all reviews + current state.

---

## 17. Quality Checks
**Service**: Annotation QA Service (port 3005)
**Tag**: `quality-checks`

### 17.1 Create Manual Quality Check
```
POST /tasks/{taskId}/quality-checks
```

**Request:**
```json
{
  "annotationId": "uuid",
  "checkType": "MANUAL",
  "qualityScore": 85,
  "status": "PASS",
  "issues": [
    {
      "category": "MISSING_LABEL",
      "severity": "MEDIUM",
      "description": "Entity at position 45-52 not labeled",
      "location": { "start": 45, "end": 52 }
    }
  ],
  "feedback": "Good work overall, but missed one entity."
}
```

### 17.2 List Quality Checks for Task
```
GET /tasks/{taskId}/quality-checks
```

### 17.3 Get Quality Check
```
GET /quality-checks/{checkId}
```

### 17.4 Resolve Quality Check
```
POST /quality-checks/{checkId}/resolve
```

**Request:**
```json
{ "resolution": "Issue corrected by annotator" }
```

### 17.5 Run Automated QC for Batch
```
POST /batches/{batchId}/quality-checks/automated
```

**Request:**
```json
{ "samplePercentage": 20 }
```

### 17.6 Get Project Quality Metrics
```
GET /projects/{projectId}/quality-metrics?startDate=2026-01-01&endDate=2026-02-03
```

**Response:**
```json
{
  "overallQualityScore": 89.5,
  "totalChecks": 1500,
  "passRate": 91.2,
  "metricsByAnnotator": [
    { "userId": "uuid", "qualityScore": 92.3, "checksCount": 200, "passRate": 95.5 }
  ],
  "commonIssues": [
    { "category": "MISSING_LABEL", "count": 45, "percentage": 3.0 }
  ]
}
```

### 17.7 Create Quality Rule
```
POST /projects/{projectId}/quality-rules
```

**Request:**
```json
{
  "name": "Completeness Check",
  "ruleType": "completeness",
  "conditions": { "requiredFields": ["label", "confidence"] },
  "threshold": 90,
  "severity": "HIGH"
}
```

### 17.8 List Quality Rules
```
GET /projects/{projectId}/quality-rules
```

### 17.9 Deactivate Quality Rule
```
DELETE /quality-rules/{ruleId}
```

### 17.10 Check Quality Gate
```
POST /quality-gates/check
```

**Request:**
```json
{
  "taskId": "uuid",
  "annotationId": "uuid",
  "stageId": "stage-annotation-1"
}
```

### 17.11 Check Consensus Quality Gate
```
POST /quality-gates/check-consensus
```

**Request:**
```json
{
  "taskId": "uuid",
  "annotationIds": ["uuid1", "uuid2", "uuid3"],
  "stageId": "stage-annotation-1"
}
```

---

## 18. Gold Tasks
**Service**: Annotation QA Service (port 3005)
**Tag**: `gold-tasks`

### 18.1 Register Gold Standard Annotation
```
POST /tasks/{taskId}/gold?projectId=uuid&userId=uuid
```

**Request:**
```json
{
  "goldAnnotation": {
    "labels": [{ "start": 0, "end": 10, "label": "PERSON" }],
    "entities": [],
    "attributes": {}
  },
  "tolerance": {
    "boundaryIouThreshold": 0.8,
    "labelExactMatch": true,
    "scoreWeights": { "labelF1": 0.6, "boundaryIou": 0.4 }
  }
}
```

### 18.2 Get Gold Standard for Task
```
GET /tasks/{taskId}/gold
```

### 18.3 Update Gold Standard
```
PATCH /tasks/{taskId}/gold
```

### 18.4 Trigger Gold Comparison
```
POST /tasks/{taskId}/gold/compare
```

**Request:**
```json
{ "annotationId": "uuid" }
```

**Response:**
```json
{
  "score": 0.87,
  "labelF1": 0.90,
  "passed": true,
  "details": { ... }
}
```

### 18.5 List Gold Tasks for Project
```
GET /projects/{projectId}/gold-tasks
```

---

## 19. Customers
**Service**: Project Management (port 3004)
**Tag**: `customers`

### 19.1 List Customers
```
GET /customers
```

### 19.2 Get Customer
```
GET /customers/{id}
```

### 19.3 Create Customer
```
POST /customers
```

**Request:**
```json
{
  "name": "Acme Corporation",
  "email": "admin@acme.com",
  "subscription": "enterprise"
}
```

### 19.4 Update Customer
```
PATCH /customers/{id}
```

### 19.5 Delete Customer
```
DELETE /customers/{id}
```

---

## 20. Media
**Service**: Project Management (port 3004)
**Tag**: `media`

### 20.1 Serve Media File (Project/Batch structure)
```
GET /media/{projectId}/{batchName}/{filename}
```

Serves files from `/app/media/{projectId}/{batchName}/{filename}` with proper `Content-Type` headers. Supports images (inline display), PDF, audio, video, CSV, JSON.

### 20.2 Serve Media File (Flat/Legacy)
```
GET /media/{filename}
```

---

## 21. Workflows (XState)
**Service**: Workflow Engine (port 3001)
**Tag**: `workflows`

### 21.1 List Workflows
```
GET /workflows?projectId=uuid&status=ACTIVE&isTemplate=false
```

### 21.2 Get Workflow
```
GET /workflows/{id}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "name": "Standard Annotation Workflow",
    "version": 2,
    "xstateDefinition": {
      "id": "annotationWorkflow",
      "initial": "queued",
      "context": { "taskId": null, "assignedTo": null, "attempts": 0 },
      "states": {
        "queued": { "on": { "ASSIGN": "assigned" } },
        "assigned": { "on": { "START": "inProgress", "EXPIRE": "queued" } },
        "inProgress": { "on": { "SUBMIT": "review", "SAVE_DRAFT": "inProgress" } },
        "review": { "on": { "APPROVE": "approved", "REJECT": "inProgress" } },
        "approved": { "type": "final" }
      }
    },
    "status": "ACTIVE",
    "isTemplate": false
  }
}
```

### 21.3 Create Workflow
```
POST /workflows
```

**Request:**
```json
{
  "projectId": "uuid",
  "name": "Custom Review Workflow",
  "description": "Multi-stage review workflow with consensus",
  "xstateDefinition": { "id": "customWorkflow", "initial": "pending", "states": { ... } },
  "stateSchema": { ... },
  "eventSchema": [ ... ],
  "isTemplate": false
}
```

### 21.4 Update Workflow
```
PATCH /workflows/{id}
```

### 21.5 Delete Workflow
```
DELETE /workflows/{id}
```

### 21.6 Validate Workflow
```
POST /workflows/{id}/validate
```

**Response:**
```json
{
  "data": {
    "isValid": true,
    "errors": [],
    "warnings": ["State 'review' has no error handling"]
  }
}
```

### 21.7 Simulate Workflow
```
POST /workflows/{id}/simulate
```

**Request:**
```json
{
  "initialContext": { "taskId": "test-123", "assignedTo": "user-uuid" },
  "events": [
    { "type": "START" },
    { "type": "SUBMIT", "payload": { "annotationData": {} } }
  ]
}
```

**Response:**
```json
{
  "data": {
    "finalState": "review",
    "finalContext": { ... },
    "transitions": [
      { "from": "assigned", "to": "inProgress", "event": "START" },
      { "from": "inProgress", "to": "review", "event": "SUBMIT" }
    ],
    "actionsExecuted": ["assignToUser", "saveAnnotation"]
  }
}
```

### 21.8 Get Workflow Visualization
```
GET /workflows/{id}/visualization
```

Returns `xstateDefinition` + `visualizationConfig` for use with XState Visualizer (stately.ai/viz).

---

## 22. XState Events & State Management
**Service**: Workflow Engine (port 3001)
**Tag**: `events`

### 22.1 Send Event to Task
```
POST /tasks/{taskId}/events?workflowId=uuid
```

**Request:**
```json
{
  "type": "SUBMIT",
  "payload": { "annotationData": { ... }, "confidence": 0.95 }
}
```

**Response:**
```json
{
  "data": {
    "transitionId": "uuid",
    "previousState": { "value": "inProgress", "context": { ... } },
    "currentState": { "value": "review", "context": { ... }, "changed": true, "tags": ["pending_review"] },
    "actionsExecuted": [{ "action": "saveAnnotation", "result": "success" }]
  }
}
```

### 22.2 Get Current Task State
```
GET /tasks/{taskId}/state?workflowId=uuid
```

**Response:**
```json
{
  "data": {
    "taskId": "uuid",
    "workflowId": "uuid",
    "currentState": {
      "value": "inProgress",
      "context": { "taskId": "uuid", "assignedTo": "user-uuid", "attempts": 1 },
      "tags": ["active"],
      "done": false
    },
    "nextEvents": ["SUBMIT", "SAVE_DRAFT"],
    "stateUpdatedAt": "2026-02-03T10:00:00Z"
  }
}
```

### 22.3 Get State History
```
GET /tasks/{taskId}/state-history?limit=50
```

### 22.4 Restore State
```
POST /tasks/{taskId}/state/restore
```

**Request:**
```json
{ "transitionId": "uuid", "reason": "Reverting incorrect state change" }
```

### 22.5 Get Possible Transitions
```
GET /tasks/{taskId}/transitions?workflowId=uuid
```

**Response:**
```json
{
  "data": {
    "currentState": "inProgress",
    "possibleEvents": [
      { "eventType": "SUBMIT", "targetState": "review", "canExecute": true },
      { "eventType": "SAVE_DRAFT", "targetState": "inProgress", "internal": true, "canExecute": true }
    ]
  }
}
```

### 22.6 Batch Event Send
```
POST /events/batch
```

**Request:**
```json
{
  "events": [
    { "entityType": "TASK", "entityId": "uuid1", "event": { "type": "APPROVE" } },
    { "entityType": "TASK", "entityId": "uuid2", "event": { "type": "REJECT", "payload": {} } }
  ]
}
```

### 22.7 Query Tasks by State
```
GET /tasks/by-state?workflowId=uuid&state=inProgress&projectId=uuid
```

---

## 23. Workflow Instances (XState Actors)
**Service**: Workflow Engine (port 3001)
**Tag**: `instances`

### 23.1 Create Workflow Instance
```
POST /workflow-instances
```

**Request:**
```json
{
  "workflowId": "uuid",
  "entityType": "BATCH",
  "entityId": "uuid",
  "initialContext": {
    "batchId": "uuid",
    "totalTasks": 500,
    "priority": 8
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workflowId": "uuid",
    "entityType": "BATCH",
    "entityId": "uuid",
    "status": "RUNNING",
    "createdAt": "2026-02-01T10:00:00Z"
  }
}
```

### 23.2 Get Workflow Instance
```
GET /workflow-instances/{instanceId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workflowId": "uuid",
    "entityType": "BATCH",
    "entityId": "uuid",
    "actorState": {
      "value": {
        "processing": {
          "annotation": "active",
          "review": "active"
        }
      },
      "context": {
        "completedTasks": 250,
        "totalTasks": 500
      }
    },
    "status": "RUNNING",
    "startedAt": "2026-02-01T10:00:00Z"
  }
}
```

### 23.3 Send Event to Instance
```
POST /workflow-instances/{instanceId}/events
```

**Request:**
```json
{
  "type": "COMPLETE",
  "payload": { "reason": "All tasks processed" }
}
```

### 23.4 Pause Instance
```
POST /workflow-instances/{instanceId}/pause
```

### 23.5 Resume Instance
```
POST /workflow-instances/{instanceId}/resume
```

### 23.6 Stop Instance
```
POST /workflow-instances/{instanceId}/stop
```

**Request:**
```json
{
  "reason": "Manual stop by admin",
  "force": false
}
```

### 23.7 Get Instance Snapshot
```
GET /workflow-instances/{instanceId}/snapshot
```

Returns the complete persisted XState actor state for point-in-time restoration.

### 23.8 Restore from Snapshot
```
POST /workflow-instances/{instanceId}/restore
```

**Request:**
```json
{
  "snapshot": { "...": "persisted actor state" }
}
```

### 23.9 List Child Actors
```
GET /workflow-instances/{instanceId}/actors
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "actorRefId": "taskActor-uuid1",
      "actorType": "CHILD",
      "state": "running",
      "parentInstanceId": "uuid"
    }
  ]
}
```

---

## 24. State Transitions (Audit Log)
**Service**: Workflow Engine (port 3001)
**Tag**: `transitions`

All XState state changes are persisted in the `state_transitions` table for full audit trail.

### 24.1 Get Transition by ID
```
GET /state-transitions/{transitionId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "entityType": "TASK",
    "entityId": "uuid",
    "workflowId": "uuid",
    "event": {
      "type": "SUBMIT",
      "payload": { "annotationData": {} },
      "timestamp": "2026-02-03T10:45:00Z"
    },
    "fromState": { "value": "inProgress", "context": {} },
    "toState": { "value": "review", "context": {} },
    "transitionType": "EXTERNAL",
    "guardsEvaluated": [
      { "guardName": "hasAnnotation", "result": true }
    ],
    "actionsExecuted": [
      { "actionName": "saveAnnotation", "executionTime": 45, "success": true }
    ],
    "userId": "uuid",
    "duration": 52
  }
}
```

### 24.2 Query Transitions
```
GET /state-transitions?entityType=TASK&entityId=uuid&workflowId=uuid
```

**Query Parameters:**
- `entityType` — filter by entity type (e.g., `TASK`, `BATCH`)
- `entityId` — filter by specific entity UUID
- `workflowId` — filter by workflow definition UUID

---

## 25. Health & System

Each microservice exposes its own health endpoint at `GET /health` (no `/api/v1` prefix).

### 25.1 Per-Service Health Check
```
GET http://localhost:{port}/health
```

| Service | Port | URL |
|---------|------|-----|
| Workflow Engine | 3001 | `http://localhost:3001/health` |
| Auth Service | 3002 | `http://localhost:3002/health` |
| Task Management | 3003 | `http://localhost:3003/health` |
| Project Management | 3004 | `http://localhost:3004/health` |
| Annotation QA Service | 3005 | `http://localhost:3005/health` |

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-03T10:30:00Z"
}
```

### 25.2 Swagger / OpenAPI UI

Each service exposes interactive API documentation at:
```
GET http://localhost:{port}/api
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Invalid email or password |
| `AUTH_TOKEN_EXPIRED` | 401 | Access token has expired |
| `AUTH_TOKEN_INVALID` | 401 | Malformed or tampered token |
| `AUTH_INSUFFICIENT_PERMISSIONS` | 403 | User role lacks required permission |
| `RESOURCE_NOT_FOUND` | 404 | Requested entity does not exist |
| `VALIDATION_ERROR` | 400 | Request body or query param validation failed |
| `DUPLICATE_RESOURCE` | 409 | Entity already exists (unique constraint violation) |
| `TASK_ALREADY_ASSIGNED` | 409 | Task is already assigned to a user |
| `ASSIGNMENT_EXPIRED` | 410 | Assignment lock has expired |
| `WORKFLOW_TRANSITION_INVALID` | 422 | XState guard rejected the requested event |
| `PLUGIN_EXECUTION_FAILED` | 422 | Plugin returned an error or HARD_BLOCK |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled server-side error |
| `SERVICE_UNAVAILABLE` | 503 | Service is temporarily unavailable |

---

## Rate Limiting

Rate limiting is not enforced at the application layer in the current implementation. It is expected to be configured at the reverse proxy / API gateway level in production.

---

## Notes

1. All timestamps are ISO 8601 format (UTC).
2. All IDs are UUID v4.
3. File uploads use `multipart/form-data`; all other endpoints accept and return `application/json`.
4. Pagination uses page + pageSize query parameters (e.g., `?page=1&pageSize=50`).
5. Soft deletes are used for critical entities (records are never hard-deleted unless explicitly noted).
6. **XState v5 Integration**:
   - Workflow definitions use the XState v5 `setup()` / `createMachine()` JSON schema.
   - State machines are compiled and cached in Redis.
   - Per-task machine state is persisted as `machineState` JSONB on the `tasks` table.
   - All state transitions are atomically logged to the `state_transitions` table.
   - Guards and actions execute server-side inside the Workflow Engine service.
   - The Actor model (`workflow-instances`) supports hierarchical batch-level orchestration with child task actors.
7. **Plugin System**: Plugins run before annotation/review submission (`ON_BLUR` / `ON_SUBMIT`). A `HARD_BLOCK` plugin failure prevents submission; `SOFT_WARN` shows a warning but allows submission; `ADVISORY` is informational only.
8. **Media Files**: Served by Project Management (port 3004) at `/api/v1/media/{projectId}/{batchName}/{filename}`. Files are stored in the container at `/app/media/`.
9. **Mock Auth (Development)**: In development, user data is sourced from `apps/auth-service/src/auth/mock-users.json`. No external identity provider is required.
