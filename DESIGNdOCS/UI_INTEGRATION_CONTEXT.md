# Welo Platform - React UI Integration Context

## Document Version: 1.0
**Date**: February 3, 2026  
**Purpose**: Comprehensive context for React-based UI development integrating with implemented backend services

---

## Executive Summary

This document provides the complete technical context, API specifications, and UI/UX requirements for developing a React-based frontend for the Welo Annotation Platform. The backend consists of 4 operational NestJS microservices with comprehensive REST APIs, Kafka event streaming, and XState workflow orchestration.

**Backend Status**: 44.7% complete (Phase 1: 60.2%, Phase 2: 21.5%)  
**Platform Architecture**: Microservices (NestJS + TypeORM + PostgreSQL + Kafka)  
**Services Ready**: Project Management (Port 3004), Task Management (Port 3003), Workflow Engine (Port 3007)

---

## Table of Contents

1. [Platform Architecture](#platform-architecture)
2. [Role-Based User Interfaces](#role-based-user-interfaces)
3. [Backend API Specifications](#backend-api-specifications)
4. [File Rendering System](#file-rendering-system)
5. [Workflow & State Management](#workflow--state-management)
6. [UI Component Requirements](#ui-component-requirements)
7. [Technical Stack Recommendations](#technical-stack-recommendations)
8. [Integration Patterns](#integration-patterns)

---

## 1. Platform Architecture

### 1.1 Microservices Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Welo Platform Frontend                    │
│                    (React Application)                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │       API Gateway / Load Balancer      │
        └───────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌──────────────────┐                  ┌──────────────────┐
│  Auth Service    │◄─────────────────┤ Project Mgmt     │
│  Port: 3002      │                  │ Service          │
│  Status: 27.5%   │                  │ Port: 3004       │
└──────────────────┘                  │ Status: ✅ 100%  │
        │                             └──────────────────┘
        │                                       │
        ▼                                       ▼
┌──────────────────┐                  ┌──────────────────┐
│  Task Mgmt       │◄─────────────────┤  Workflow Engine │
│  Service         │                  │  Service         │
│  Port: 3003      │                  │  Port: 3007      │
│  Status: ✅ 100% │                  │  Status: ✅ 95%  │
└──────────────────┘                  └──────────────────┘
        │                                       │
        └───────────────────┬───────────────────┘
                            ▼
                  ┌──────────────────┐
                  │  Kafka Event Bus │
                  │  (Event Driven)  │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │   PostgreSQL DB  │
                  │   (Shared Schema)│
                  └──────────────────┘
```

### 1.2 Data Hierarchy

The platform follows a strict hierarchical data model:

```
Customer (Workspace)
    └── Project
        └── Batch
            └── Task
                └── Assignment
                    └── Annotation
                        └── Annotation Response
                            └── Review Approval (Git-like review)
```

### 1.3 Service Responsibilities

| Service | Port | Responsibilities | Status |
|---------|------|------------------|--------|
| **Auth Service** | 3002 | Login, JWT, RBAC, Okta SSO | ⚠️ 27.5% |
| **Project Management** | 3004 | Projects, Batches, Customers, User Management | ✅ 100% |
| **Task Management** | 3003 | Tasks, Assignments, Annotations, Queue Management | ✅ 100% |
| **Workflow Engine** | 3007 | XState machines, State transitions, Pipeline logic | ✅ 95% |

---

## 2. Role-Based User Interfaces

### 2.1 Role Definitions

```typescript
enum UserRole {
  ADMIN = 'ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',  // Ops Manager
  REVIEWER = 'REVIEWER',
  ANNOTATOR = 'ANNOTATOR',              // Rater
  CUSTOMER = 'CUSTOMER'
}
```

### 2.2 Admin Dashboard

**Purpose**: Platform administration and system monitoring

**Key Features**:
- User management (CRUD, role assignment, activation/deactivation)
- Platform analytics and monitoring
- System configuration
- Audit log viewer
- Service health monitoring

**Primary Views**:
```
/admin/dashboard
├── /users              # User management
├── /analytics          # Platform-wide metrics
├── /system-config      # Configuration management
├── /audit-logs         # Activity tracking
└── /service-health     # Microservice monitoring
```

**API Endpoints Used**:
```typescript
// User Management
GET    /api/v1/users
POST   /api/v1/users
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id

// System Analytics
GET    /api/v1/analytics/platform-stats
GET    /api/v1/audit-logs
```

---

### 2.3 Project Manager (Ops Manager) Dashboard

**Purpose**: Project creation, workflow configuration, team management

**Key Features**:

#### 2.3.1 Project Management
- Create/Edit/Delete projects
- Configure project metadata (name, description, type)
- Set quality thresholds (consensus, benchmarks)
- Manage project teams (assign annotators, reviewers)

#### 2.3.2 Workflow Configuration (Critical Feature)
**Visual Workflow Builder**:
```
Create → Annotation (L0) → Review (L1) → Review (L2) → Validation → Complete
           ↓ (skip)            ↓ (reject)    ↓ (reject)
         Hold Queue          Rework         Rework
```

**Workflow Settings**:
```typescript
interface WorkflowConfiguration {
  // Review Levels
  reviewLevels: Array<{
    level: number;              // 1, 2, 3...
    name: string;               // "L1 Review", "L2 Review"
    reviewersCount: number;     // How many reviewers per level
    requireAllApprovals: boolean; // Unanimous vs threshold
    approvalThreshold?: number; // e.g., 2 out of 3
    autoAssign: boolean;        // Auto-assign or manual
    allowedReviewers?: string[]; // Specific reviewer IDs
  }>;
  
  // Consensus Configuration
  enableMultiAnnotator: boolean;
  annotatorsPerTask: number;       // e.g., 3 annotators
  consensusThreshold: number;      // e.g., 0.80 (80% agreement)
  
  // Queue Configuration
  queueStrategy: 'FIFO' | 'PRIORITY' | 'SKILL_BASED';
  assignmentExpiration: number;    // Hours before auto-release
  maxTasksPerAnnotator: number;
}
```

**UI Component**: Drag-and-drop workflow stage builder with:
- Add/remove stages
- Configure each stage's properties
- Preview workflow graph
- Save as template

#### 2.3.3 Annotation Questions Builder (Critical Feature)

**Dynamic Form Builder**:
```typescript
interface AnnotationQuestion {
  id: string;
  type: 'MULTI_SELECT' | 'SINGLE_SELECT' | 'TEXT' | 'NUMBER' | 'DATE' | 'RATING' | 'MULTI_TURN';
  label: string;
  description?: string;
  required: boolean;
  
  // Conditional Logic
  dependsOn?: string;      // Parent question ID
  showWhen?: any;          // Condition to show this question
  
  // Type-specific options
  options?: Array<{        // For SELECT types
    value: string;
    label: string;
    icon?: string;
  }>;
  
  validation?: {
    min?: number;          // For NUMBER, TEXT length
    max?: number;
    pattern?: string;      // Regex for TEXT
    customMessage?: string;
  };
  
  // Multi-turn specific
  turns?: Array<{
    role: 'user' | 'assistant';
    label: string;
  }>;
}
```

**UI Features**:
- Drag-and-drop question ordering
- Live preview of annotation form
- Question templates library
- Conditional logic builder (if-then rules)
- Import/export question sets

**Example Configuration UI**:
```
┌─────────────────────────────────────────────┐
│ Question Builder                             │
├─────────────────────────────────────────────┤
│ Question Type: [Multi-Select ▼]             │
│ Label: "Select applicable topics"           │
│ Required: [✓]                                │
│                                              │
│ Options:                                     │
│  • Technology        [Edit] [Delete]         │
│  • Business          [Edit] [Delete]         │
│  • Science           [Edit] [Delete]         │
│  [+ Add Option]                              │
│                                              │
│ Conditional Logic:                           │
│  Show when: [Previous Question ▼]           │
│             equals [Technology]              │
│                                              │
│ [Save Question]  [Preview Form]              │
└─────────────────────────────────────────────┘
```

#### 2.3.4 Batch Management
- Upload tasks (CSV/JSON with file URLs)
- Bulk task import with validation
- Batch allocation to projects
- Monitor batch progress
- Export completed batches

#### 2.3.5 Primary Views
```
/ops/dashboard
├── /projects
│   ├── /create               # Project creation wizard
│   ├── /:projectId/edit      # Edit project settings
│   ├── /:projectId/workflow  # Workflow configuration
│   └── /:projectId/questions # Question builder
├── /batches
│   ├── /create               # Batch upload
│   ├── /:batchId/tasks       # Task list
│   └── /:batchId/statistics  # Batch analytics
├── /teams                    # Team management
└── /analytics                # Project analytics
```

**API Endpoints**:
```typescript
// Project Management
GET    /api/v1/projects
POST   /api/v1/projects
PATCH  /api/v1/projects/:id
DELETE /api/v1/projects/:id
POST   /api/v1/projects/:id/clone

// Batch Management
POST   /api/v1/batches
GET    /api/v1/batches/:id/statistics
POST   /api/v1/batches/:id/complete

// Task Upload
POST   /api/v1/tasks/bulk
GET    /api/v1/tasks?batchId=:id

// Workflow Configuration
GET    /api/v1/workflows/:projectId
POST   /api/v1/workflows/:projectId/update-config
GET    /api/v1/workflows/:projectId/state-machine
```

---

### 2.4 Annotator (Rater) Portal

**Purpose**: Task annotation and submission

**Key Features**:

#### 2.4.1 Task Queue
- Pull next available task (FIFO)
- View assigned tasks
- Task filtering (by project, priority)
- Estimated time per task
- Current workload visibility

#### 2.4.2 Annotation Editor (Critical Feature)

**Multi-File Rendering Engine**:

The editor must support rendering different file types with a consistent annotation interface:

```typescript
interface TaskFile {
  id: string;
  url: string;              // Signed S3 URL
  type: 'TEXT' | 'CSV' | 'AUDIO' | 'VIDEO' | 'IMAGE' | 'HTML' | 'MARKDOWN';
  metadata: {
    size: number;
    duration?: number;      // For audio/video
    dimensions?: {          // For images/video
      width: number;
      height: number;
    };
  };
}
```

**Rendering Components**:

1. **Text Renderer**:
   - Syntax highlighting for code
   - Word wrap control
   - Font size adjustment
   - Copy functionality

2. **CSV Renderer**:
   - Tabular display with sorting
   - Column filtering
   - Search within table
   - Export to Excel

3. **Audio Player**:
   - Waveform visualization
   - Playback controls (play, pause, seek, speed)
   - Timestamp markers
   - Loop region selection
   - **Future**: Inline annotation on waveform

4. **Video Player**:
   - Custom controls (play, pause, seek, speed, fullscreen)
   - Frame-by-frame navigation
   - Screenshot capture
   - Subtitle support
   - **Future**: Bounding box annotation on frames

5. **Image Viewer**:
   - Zoom and pan
   - Brightness/contrast adjustment
   - Full-screen mode
   - **Future**: Drawing tools for annotation

**Annotation Form Renderer**:
- Dynamic form generation from project configuration
- Real-time validation
- Progress saving (auto-save draft)
- Conditional question display
- Multi-turn conversation interface
- Rich text input support

**Editor Layout**:
```
┌────────────────────────────────────────────────────┐
│ Task #12345  │  Audio Transcription  │  Timer: 3:45 │
├────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────┐          │
│  │  File Viewer (50% height)             │          │
│  │                                        │          │
│  │  [Audio Waveform Visualization]       │          │
│  │  ▶️ ⏸️ ⏮️ ⏭️ Speed: 1.0x Volume: 🔊      │          │
│  │                                        │          │
│  └──────────────────────────────────────┘          │
│                                                     │
│  ┌──────────────────────────────────────┐          │
│  │  Annotation Form (50% height)         │          │
│  │                                        │          │
│  │  Q1: Select audio quality              │          │
│  │  ○ Clear  ○ Moderate  ○ Poor          │          │
│  │                                        │          │
│  │  Q2: Transcribe the audio              │          │
│  │  [Text area input...]                  │          │
│  │                                        │          │
│  │  Q3: Identify speaker count            │          │
│  │  [1] speakers                          │          │
│  │                                        │          │
│  └──────────────────────────────────────┘          │
│                                                     │
│  [Save Draft]  [Skip Task]  [Submit]               │
└────────────────────────────────────────────────────┘
```

#### 2.4.3 Task Actions
- Submit annotation
- Skip task (with reason)
- Request clarification
- Save draft (auto-save every 30s)
- View task history

#### 2.4.4 Performance Dashboard
- Tasks completed today/week/month
- Average time per task
- Accuracy metrics (benchmark performance)
- Earnings estimation
- Task completion trends

**Primary Views**:
```
/annotate
├── /queue                    # Available tasks
├── /task/:taskId            # Annotation editor
├── /assigned                 # My assigned tasks
├── /history                  # Completed tasks
└── /dashboard                # Performance metrics
```

**API Endpoints**:
```typescript
// Queue Management
POST   /api/v1/tasks/next              # Get next task (FIFO)
GET    /api/v1/tasks?userId=:id&status=ASSIGNED

// Task Operations
GET    /api/v1/tasks/:id
POST   /api/v1/tasks/:id/submit        # Submit annotation
PATCH  /api/v1/tasks/:id/status        # Skip, hold, etc.

// File Access
GET    /api/v1/files/:fileId/signed-url  # Get S3 signed URL

// User Stats
GET    /api/v1/users/:id/statistics
```

---

### 2.5 Reviewer Portal

**Purpose**: Review annotations, approve/reject, provide feedback

**Key Features**:

#### 2.5.1 Review Queue
- Level-based queue (L1, L2, L3 reviews)
- Priority sorting
- Filter by project, annotator, date
- Bulk review capabilities

#### 2.5.2 Review Editor (Extended Annotation Editor)

**Additional Features**:
- Side-by-side comparison (original vs annotation)
- Multi-annotator consensus view (when enabled)
- Annotation diff highlighting
- Comment system
- Approval/rejection workflow

**Consensus View** (for multi-annotator tasks):
```
┌─────────────────────────────────────────────────────┐
│ Task #12345 - 3 Annotators (Consensus: 67%)         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Question 1: Select audio quality                   │
│  ✓ Annotator A: Clear                               │
│  ✓ Annotator B: Clear                               │
│  ✗ Annotator C: Moderate                            │
│  Consensus: Clear (2/3) ✅                           │
│                                                      │
│  Question 2: Transcribe the audio                   │
│  Annotator A: "The quick brown fox..."              │
│  Annotator B: "The quick brown fox..."              │
│  Annotator C: "The quick brown box..."              │
│  Diff: "fo[x]" vs "bo[x]" ⚠️                        │
│  Consensus: 67% - Manual Review Required            │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### 2.5.3 Review Actions
- Approve (advance to next stage)
- Reject (send back with feedback)
- Request rework
- Add comments/notes
- Flag for QA escalation

#### 2.5.4 Batch Review
- Approve multiple tasks at once
- Bulk rejection with common feedback
- Export review decisions

**Primary Views**:
```
/review
├── /queue                    # Review queue
├── /task/:taskId            # Review editor
├── /batch-review             # Bulk operations
├── /history                  # Reviewed tasks
└── /dashboard                # Review metrics
```

**API Endpoints**:
```typescript
// Review Queue
GET    /api/v1/tasks?reviewLevel=:level&status=PENDING_REVIEW

// Review Operations
POST   /api/v1/tasks/:id/approve
POST   /api/v1/tasks/:id/reject
POST   /api/v1/tasks/:id/request-rework
POST   /api/v1/tasks/bulk-action       # Bulk approve/reject

// Comments
POST   /api/v1/tasks/:id/comments
GET    /api/v1/tasks/:id/comments
```

---

## 3. Backend API Specifications

### 3.1 Project Management Service (Port 3004)

#### Base URL: `http://localhost:3004/api/v1`

**Projects**:
```typescript
// List Projects
GET /projects
Query Parameters:
  - customerId?: string
  - status?: ProjectStatus
  - search?: string
  - page?: number
  - limit?: number
Response: {
  data: Project[];
  total: number;
  page: number;
  limit: number;
}

// Create Project
POST /projects
Body: {
  name: string;
  description?: string;
  customerId: string;
  projectType: ProjectType;
  annotationQuestions: AnnotationQuestion[];  // Dynamic questions
  reviewLevels: ReviewLevel[];                // Workflow config
  enableMultiAnnotator: boolean;
  consensusThreshold?: number;
  maxAnnotatorsPerTask?: number;
}
Response: Project

// Update Project
PATCH /projects/:id
Body: Partial<CreateProjectDto>
Response: Project

// Delete Project (soft delete)
DELETE /projects/:id
Response: { success: boolean }

// Clone Project
POST /projects/:id/clone
Body: {
  newName: string;
  copyTasks?: boolean;
}
Response: Project
```

**Batches**:
```typescript
// Create Batch
POST /batches
Body: {
  projectId: string;
  name: string;
  description?: string;
  priority?: number;
}
Response: Batch

// Get Batch Statistics
GET /batches/:id/statistics
Response: {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  queuedTasks: number;
  averageCompletionTime: number;
  qualityScore: number;
}

// Complete Batch
POST /batches/:id/complete
Response: Batch
```

**Customers (Workspaces)**:
```typescript
// List Customers
GET /customers
Response: Customer[]

// Create Customer
POST /customers
Body: {
  name: string;
  email: string;
  subscription?: string;
}
Response: Customer
```

**Users**:
```typescript
// List Users
GET /users
Query Parameters:
  - role?: UserRole
  - status?: UserStatus
  - search?: string
Response: User[]

// Create User
POST /users
Body: {
  email: string;
  name: string;
  role: UserRole;
  password: string;
}
Response: User

// Update User
PATCH /users/:id
Body: Partial<CreateUserDto>
Response: User

// User Statistics
GET /users/:id/statistics
Response: {
  totalTasksCompleted: number;
  averageTimePerTask: number;
  accuracyRate: number;
  currentStreak: number;
}
```

---

### 3.2 Task Management Service (Port 3003)

#### Base URL: `http://localhost:3003/api/v1`

**Tasks**:
```typescript
// List Tasks
GET /tasks
Query Parameters:
  - batchId?: string
  - projectId?: string
  - status?: TaskStatus
  - priority?: number
  - assignedTo?: string
  - page?: number
  - limit?: number
  - sortBy?: string
  - sortOrder?: 'ASC' | 'DESC'
Response: {
  data: Task[];
  total: number;
  page: number;
  limit: number;
}

// Get Task
GET /tasks/:id
Response: Task (includes file metadata, questions, assignments)

// Create Task
POST /tasks
Body: {
  batchId: string;
  fileUrl: string;
  fileType: FileType;
  fileMetadata?: object;
  priority?: number;
  estimatedDuration?: number;
}
Response: Task

// Bulk Create Tasks
POST /tasks/bulk
Body: {
  batchId: string;
  tasks: Array<{
    fileUrl: string;
    fileType: FileType;
    fileMetadata?: object;
  }>;
}
Response: {
  created: Task[];
  errors: Array<{ index: number; error: string }>;
}

// Update Task
PATCH /tasks/:id
Body: Partial<{
  priority: number;
  status: TaskStatus;
  metadata: object;
}>
Response: Task

// Delete Task (soft delete)
DELETE /tasks/:id
Response: { success: boolean }
```

**Assignment & Queue**:
```typescript
// Get Next Task (FIFO Queue)
POST /tasks/next
Body: {
  userId: string;
  projectId?: string;
}
Response: Task (auto-assigned to user)

// Assign Task
POST /tasks/:id/assign
Body: {
  userId: string;
  reviewLevel?: number;
  expiresIn?: number;  // Hours
}
Response: Assignment

// Submit Annotation
POST /tasks/:id/submit
Body: {
  userId: string;
  responses: Array<{
    questionId: string;
    answer: any;
    timeSpent: number;
    confidence?: number;
  }>;
  timeSpent: number;
  notes?: string;
}
Response: Annotation

// Update Task Status
PATCH /tasks/:id/status
Body: {
  status: TaskStatus;
  reason?: string;
  metadata?: object;
}
Response: Task
```

**Bulk Operations**:
```typescript
// Bulk Actions
POST /tasks/bulk-action
Body: {
  taskIds: string[];
  action: 'ASSIGN' | 'SKIP' | 'RESET' | 'ARCHIVE' | 'HOLD' | 'PRIORITY_CHANGE';
  payload: {
    userId?: string;        // For ASSIGN
    reason?: string;        // For SKIP
    priority?: number;      // For PRIORITY_CHANGE
  };
}
Response: {
  success: string[];
  failed: Array<{ taskId: string; error: string }>;
}
```

**Task Statistics**:
```typescript
// Get Task Statistics
GET /tasks/:id/statistics
Response: {
  annotationCount: number;
  consensusScore?: number;
  averageTimeSpent: number;
  reviewsCompleted: number;
  currentStage: string;
}
```

---

### 3.3 Workflow Engine Service (Port 3007)

#### Base URL: `http://localhost:3007/api/v1`

**Workflows**:
```typescript
// Get Workflow Configuration
GET /workflows/:projectId
Response: {
  projectId: string;
  stages: WorkflowStage[];
  stateMachine: XStateConfig;  // XState machine definition
}

// Update Workflow Configuration
POST /workflows/:projectId/update-config
Body: {
  reviewLevels: ReviewLevel[];
  enableMultiAnnotator: boolean;
  consensusThreshold: number;
}
Response: Workflow

// Get State Machine
GET /workflows/:projectId/state-machine
Response: XStateConfig (for visualization)

// Send Event (State Transition)
POST /tasks/:taskId/events
Body: {
  event: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'SKIP' | 'RESET';
  context?: object;
}
Response: {
  currentState: string;
  nextStates: string[];
}
```

**Workflow Visualization**:
```typescript
// Get Workflow Graph
GET /workflows/:projectId/graph
Response: {
  nodes: Array<{ id: string; label: string; type: string }>;
  edges: Array<{ from: string; to: string; label: string }>;
}
```

---

### 3.4 Auth Service (Port 3002) - To Be Implemented

```typescript
// Login
POST /auth/login
Body: {
  email: string;
  password: string;
}
Response: {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// SSO Login (Okta)
GET /auth/okta
Redirect to Okta OAuth2

// Refresh Token
POST /auth/refresh
Body: {
  refreshToken: string;
}
Response: {
  accessToken: string;
}

// Get Current User
GET /auth/me
Headers: { Authorization: 'Bearer <token>' }
Response: User

// Logout
POST /auth/logout
Response: { success: boolean }
```

---

## 4. File Rendering System

### 4.1 Supported File Types

```typescript
enum FileType {
  TEXT = 'TEXT',           // .txt
  MARKDOWN = 'MARKDOWN',   // .md
  HTML = 'HTML',           // .html
  CSV = 'CSV',             // .csv
  JSON = 'JSON',           // .json
  AUDIO = 'AUDIO',         // .mp3, .wav, .ogg
  VIDEO = 'VIDEO',         // .mp4, .webm
  IMAGE = 'IMAGE',         // .jpg, .png, .gif
  PDF = 'PDF'              // .pdf
}
```

### 4.2 File Metadata Structure

```typescript
interface FileMetadata {
  originalName: string;
  size: number;           // bytes
  mimeType: string;
  
  // Audio/Video specific
  duration?: number;      // seconds
  codec?: string;
  bitrate?: number;
  
  // Image/Video specific
  dimensions?: {
    width: number;
    height: number;
  };
  
  // CSV specific
  rowCount?: number;
  columnCount?: number;
  headers?: string[];
}
```

### 4.3 Signed URL Pattern

All files are stored in S3 and accessed via signed URLs for security:

```typescript
// Get signed URL
GET /api/v1/files/:fileId/signed-url
Response: {
  url: string;            // Signed S3 URL (expires in 1 hour)
  expiresAt: string;      // ISO timestamp
}
```

### 4.4 React Component Structure

```typescript
// FileRenderer Component
interface FileRendererProps {
  fileType: FileType;
  fileUrl: string;
  metadata: FileMetadata;
  onAnnotate?: (annotation: any) => void;  // Future: inline annotation
}

// Usage
<FileRenderer 
  fileType="AUDIO"
  fileUrl={signedUrl}
  metadata={task.fileMetadata}
  onAnnotate={handleAnnotation}
/>
```

**Recommended Libraries**:
- **Audio**: wavesurfer.js or react-h5-audio-player
- **Video**: video.js or react-player
- **CSV**: react-data-grid or ag-grid-react
- **PDF**: react-pdf
- **Text**: react-syntax-highlighter (for code)
- **Images**: react-image-gallery with zoom

### 4.5 Future Enhancement: Inline Annotation

```typescript
interface InlineAnnotation {
  fileId: string;
  type: 'BOUNDING_BOX' | 'TIMESTAMP' | 'REGION' | 'HIGHLIGHT';
  
  // For images/video
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // For audio/video
  timeRange?: {
    start: number;
    end: number;
  };
  
  // For text
  textRange?: {
    start: number;
    end: number;
  };
  
  label: string;
  metadata?: object;
}
```

---

## 5. Workflow & State Management

### 5.1 XState Integration

The backend uses XState for workflow orchestration. The frontend should:
1. Fetch state machine configuration
2. Visualize workflow stages
3. Enable state transitions via API

**State Machine Structure**:
```typescript
interface WorkflowStateMachine {
  id: string;
  initial: string;
  states: {
    [key: string]: {
      on: {
        [event: string]: {
          target: string;
          cond?: string;
          actions?: string[];
        };
      };
    };
  };
}
```

**Example State Machine** (from backend):
```javascript
{
  id: 'task-workflow',
  initial: 'queued',
  states: {
    queued: {
      on: { ASSIGN: 'assigned' }
    },
    assigned: {
      on: { 
        SUBMIT: 'annotation',
        SKIP: 'queued'
      }
    },
    annotation: {
      on: { 
        COMPLETE: 'checkConsensus',
        REJECT: 'assigned'
      }
    },
    checkConsensus: {
      on: {
        PASS: 'reviewLevel1',
        FAIL: 'assigned'
      }
    },
    reviewLevel1: {
      on: {
        APPROVE: 'reviewLevel2',
        REJECT: 'rework'
      }
    },
    reviewLevel2: {
      on: {
        APPROVE: 'completed',
        REJECT: 'rework'
      }
    },
    rework: {
      on: { SUBMIT: 'reviewLevel1' }
    },
    completed: {
      type: 'final'
    }
  }
}
```

### 5.2 Workflow Visualization

**Recommended**: Use react-flow or d3.js for workflow graph visualization

```typescript
// Workflow Graph Component
<WorkflowGraph
  stateMachine={workflow.stateMachine}
  currentState={task.currentState}
  onNodeClick={handleStageClick}
/>
```

---

## 6. UI Component Requirements

### 6.1 Design System

**Recommended**: Material-UI (MUI) or Ant Design for consistency

**Color Palette**:
```css
--primary: #1976d2;      /* Actions, links */
--secondary: #dc004e;    /* Warnings, deletions */
--success: #4caf50;      /* Approvals, completions */
--warning: #ff9800;      /* Pending reviews */
--error: #f44336;        /* Rejections, errors */
--info: #2196f3;         /* Info messages */
```

### 6.2 Key Components

#### 6.2.1 Reusable Components

```typescript
// DataTable Component
<DataTable
  columns={projectColumns}
  data={projects}
  pagination={true}
  onRowClick={handleRowClick}
  actions={[
    { icon: 'edit', onClick: handleEdit },
    { icon: 'delete', onClick: handleDelete }
  ]}
/>

// FormBuilder Component (for annotation questions)
<FormBuilder
  schema={project.annotationQuestions}
  onSubmit={handleSubmit}
  autoSave={true}
  autoSaveInterval={30000}  // 30 seconds
/>

// FileUploader Component
<FileUploader
  accept=".csv,.json"
  maxSize={100 * 1024 * 1024}  // 100MB
  onUpload={handleBatchUpload}
  validation={validateBatchFile}
  showProgress={true}
/>

// StatCard Component
<StatCard
  title="Tasks Completed"
  value={234}
  trend={+12.5}
  icon={<CheckCircleIcon />}
/>

// ActivityFeed Component
<ActivityFeed
  events={recentActivity}
  realtime={true}
  filters={['tasks', 'reviews', 'system']}
/>
```

#### 6.2.2 Workflow Components

```typescript
// WorkflowBuilder Component
<WorkflowBuilder
  initialConfig={project.workflow}
  onSave={handleWorkflowSave}
  stageTemplates={stageLibrary}
/>

// QuestionBuilder Component
<QuestionBuilder
  questions={project.annotationQuestions}
  onChange={handleQuestionsUpdate}
  templates={questionTemplates}
  previewMode={true}
/>

// TaskEditor Component
<TaskEditor
  task={currentTask}
  questions={project.annotationQuestions}
  onSubmit={handleTaskSubmit}
  onSkip={handleTaskSkip}
  autoSave={true}
/>

// ReviewComparison Component
<ReviewComparison
  annotations={[annotation1, annotation2, annotation3]}
  consensusThreshold={0.8}
  onApprove={handleApprove}
  onReject={handleReject}
/>
```

### 6.3 State Management

**Recommended**: Redux Toolkit or Zustand

```typescript
// Store Structure
interface AppState {
  auth: {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
  };
  projects: {
    list: Project[];
    current: Project | null;
    loading: boolean;
  };
  tasks: {
    queue: Task[];
    current: Task | null;
    assigned: Task[];
  };
  workflow: {
    stateMachine: WorkflowStateMachine | null;
    currentState: string;
  };
  ui: {
    sidebarOpen: boolean;
    theme: 'light' | 'dark';
    notifications: Notification[];
  };
}
```

### 6.4 Real-time Updates

**WebSocket Integration** (for future enhancement):

```typescript
// WebSocket connection
const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('task.assigned', (task) => {
  dispatch(addTaskToQueue(task));
  showNotification('New task assigned');
});

ws.on('task.completed', (taskId) => {
  dispatch(removeTaskFromQueue(taskId));
});

ws.on('workflow.stateChanged', (update) => {
  dispatch(updateTaskState(update));
});
```

---

## 7. Technical Stack Recommendations

### 7.1 Frontend Stack

```json
{
  "framework": "React 18+",
  "language": "TypeScript 5+",
  "styling": "Material-UI (MUI) or Tailwind CSS",
  "stateManagement": "Redux Toolkit + RTK Query",
  "routing": "React Router v6",
  "forms": "React Hook Form + Zod validation",
  "charts": "Recharts or Chart.js",
  "dataTables": "TanStack Table (react-table v8)",
  "workflow": "react-flow or d3.js",
  "testing": "Jest + React Testing Library",
  "e2e": "Playwright or Cypress"
}
```

### 7.2 API Client

```typescript
// Using RTK Query for API calls
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const weloApi = createApi({
  reducerPath: 'weloApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Project', 'Task', 'Batch', 'User'],
  endpoints: (builder) => ({
    getProjects: builder.query<Project[], void>({
      query: () => '/projects',
      providesTags: ['Project'],
    }),
    createProject: builder.mutation<Project, CreateProjectDto>({
      query: (body) => ({
        url: '/projects',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Project'],
    }),
    // ... more endpoints
  }),
});
```

### 7.3 Project Structure

```
src/
├── api/
│   ├── weloApi.ts              # RTK Query API
│   ├── endpoints/
│   │   ├── projects.ts
│   │   ├── tasks.ts
│   │   ├── batches.ts
│   │   └── users.ts
│   └── types.ts                # API types
├── components/
│   ├── common/
│   │   ├── DataTable/
│   │   ├── FormBuilder/
│   │   ├── FileUploader/
│   │   └── StatCard/
│   ├── file-renderers/
│   │   ├── TextRenderer/
│   │   ├── CSVRenderer/
│   │   ├── AudioRenderer/
│   │   ├── VideoRenderer/
│   │   └── ImageRenderer/
│   ├── workflow/
│   │   ├── WorkflowBuilder/
│   │   ├── WorkflowGraph/
│   │   └── QuestionBuilder/
│   └── task/
│       ├── TaskEditor/
│       ├── TaskQueue/
│       └── ReviewComparison/
├── features/
│   ├── admin/
│   ├── ops-manager/
│   ├── annotator/
│   └── reviewer/
├── hooks/
│   ├── useAuth.ts
│   ├── useWorkflow.ts
│   └── useFileRenderer.ts
├── store/
│   ├── index.ts
│   ├── slices/
│   │   ├── authSlice.ts
│   │   ├── projectSlice.ts
│   │   └── taskSlice.ts
│   └── middleware/
├── utils/
│   ├── validation.ts
│   ├── fileHelpers.ts
│   └── consensusCalculator.ts
├── types/
│   ├── entities.ts
│   ├── dtos.ts
│   └── enums.ts
├── App.tsx
└── main.tsx
```

---

## 8. Integration Patterns

### 8.1 Authentication Flow

```typescript
// Login flow
1. User enters credentials
2. POST /auth/login → Get JWT token
3. Store token in Redux + localStorage
4. Add token to all API requests via prepareHeaders
5. Redirect based on user role:
   - ADMIN → /admin/dashboard
   - PROJECT_MANAGER → /ops/dashboard
   - REVIEWER → /review/queue
   - ANNOTATOR → /annotate/queue
```

### 8.2 Task Lifecycle Flow

```typescript
// Annotator Flow
1. GET /tasks/next (pull next task)
2. GET /files/:fileId/signed-url (get file URL)
3. Render file + annotation form
4. POST /tasks/:id/submit (submit annotation)
5. Workflow Engine automatically transitions state
6. Kafka event published → Notification sent

// Reviewer Flow
1. GET /tasks?reviewLevel=1&status=PENDING_REVIEW
2. GET /tasks/:id (get task with annotations)
3. Review annotation
4. POST /tasks/:id/approve or POST /tasks/:id/reject
5. State transition → Next stage or rework
```

### 8.3 Project Creation Flow

```typescript
// Ops Manager Flow
1. Navigate to /ops/projects/create
2. Fill project details (name, type, customer)
3. Configure workflow:
   - Add review levels
   - Set consensus rules
   - Configure queue strategy
4. Build annotation questions:
   - Drag-drop question types
   - Configure validation rules
   - Set conditional logic
5. Preview configuration
6. POST /projects (create project)
7. POST /workflows/:projectId/update-config
8. Redirect to /ops/projects/:id
```

### 8.4 Error Handling

```typescript
// Global error handler
import { isRejectedWithValue } from '@reduxjs/toolkit';
import type { Middleware } from '@reduxjs/toolkit';

export const errorMiddleware: Middleware = () => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const error = action.payload as any;
    
    if (error.status === 401) {
      // Unauthorized - redirect to login
      dispatch(logout());
      navigate('/login');
    } else if (error.status === 403) {
      // Forbidden - show permission error
      showNotification('You do not have permission', 'error');
    } else if (error.status >= 500) {
      // Server error
      showNotification('Server error. Please try again.', 'error');
    }
  }
  
  return next(action);
};
```

### 8.5 Optimistic Updates

```typescript
// Example: Approve task with optimistic update
const [approveTask] = useApproveTaskMutation();

const handleApprove = async (taskId: string) => {
  // Optimistically update UI
  dispatch(updateTaskStatus({ taskId, status: 'APPROVED' }));
  
  try {
    await approveTask(taskId).unwrap();
    showNotification('Task approved successfully', 'success');
  } catch (error) {
    // Rollback on error
    dispatch(revertTaskStatus(taskId));
    showNotification('Failed to approve task', 'error');
  }
};
```

---

## 9. Performance Considerations

### 9.1 File Loading
- Use signed URLs with 1-hour expiration
- Implement lazy loading for large files
- Show loading skeletons during file fetch
- Cache signed URLs in memory

### 9.2 Large Lists
- Implement virtual scrolling for task queues (react-window)
- Server-side pagination for all list views
- Infinite scroll for activity feeds

### 9.3 Real-time Updates
- WebSocket for live notifications
- Polling fallback every 30 seconds
- Debounce auto-save to reduce API calls

---

## 10. Security Considerations

### 10.1 Authentication
- Store JWT in httpOnly cookies (if possible)
- Refresh token rotation
- Auto-logout after 30 minutes of inactivity

### 10.2 Authorization
- Check user role before rendering components
- Validate permissions on backend (never trust frontend)
- Hide actions user cannot perform

### 10.3 File Access
- Always use signed URLs (never expose S3 URLs directly)
- Validate file types before rendering
- Sanitize HTML/markdown content (prevent XSS)

---

## 11. Testing Strategy

### 11.1 Unit Tests
- Test Redux slices
- Test utility functions
- Test React hooks

### 11.2 Component Tests
- Test user interactions
- Test form validation
- Test error states

### 11.3 E2E Tests
- Test complete user flows:
  - Project creation
  - Task annotation
  - Review workflow
  - Batch upload

---

## 12. Deployment

### 12.1 Build Configuration

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "jest",
    "test:e2e": "playwright test"
  }
}
```

### 12.2 Environment Variables

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_PROJECT_MGMT_URL=http://localhost:3004
VITE_TASK_MGMT_URL=http://localhost:3003
VITE_WORKFLOW_URL=http://localhost:3007
VITE_AUTH_URL=http://localhost:3002
VITE_WS_URL=ws://localhost:3000
VITE_OKTA_CLIENT_ID=your_client_id
VITE_OKTA_ISSUER=https://your-domain.okta.com
```

---

## 13. Next Steps

### Phase 1 (MVP):
1. ✅ Setup React + TypeScript + MUI project
2. ✅ Implement authentication (login, JWT handling)
3. ✅ Build project management UI (for Ops Manager)
4. ✅ Build workflow builder UI
5. ✅ Build question builder UI
6. ✅ Build task annotation editor (text, CSV, audio, video)
7. ✅ Build review interface
8. ✅ Implement FIFO queue UI
9. ✅ Add batch upload functionality
10. ✅ Build basic analytics dashboards

### Phase 2 (Enhancements):
1. ⏳ Add inline annotation (bounding boxes, timestamps)
2. ⏳ WebSocket real-time updates
3. ⏳ Advanced analytics (charts, trends)
4. ⏳ Bulk operations UI
5. ⏳ Export functionality
6. ⏳ User impersonation (for troubleshooting)
7. ⏳ Advanced search and filtering

---

## 14. API Integration Examples

### 14.1 Create Project with Workflow

```typescript
const createProjectWithWorkflow = async (data: CreateProjectInput) => {
  // Step 1: Create project
  const project = await createProject({
    name: data.name,
    description: data.description,
    customerId: data.customerId,
    projectType: data.projectType,
    annotationQuestions: data.questions,
    reviewLevels: data.workflow.reviewLevels,
    enableMultiAnnotator: data.workflow.enableMultiAnnotator,
    consensusThreshold: data.workflow.consensusThreshold,
  }).unwrap();
  
  // Step 2: Configure workflow
  await updateWorkflowConfig({
    projectId: project.id,
    reviewLevels: data.workflow.reviewLevels,
    enableMultiAnnotator: data.workflow.enableMultiAnnotator,
    consensusThreshold: data.workflow.consensusThreshold,
  }).unwrap();
  
  // Step 3: Fetch generated state machine
  const stateMachine = await getStateMachine(project.id).unwrap();
  
  return { project, stateMachine };
};
```

### 14.2 Task Annotation Flow

```typescript
const handleTaskAnnotation = async () => {
  // Step 1: Get next task
  const task = await getNextTask({ userId: currentUser.id }).unwrap();
  
  // Step 2: Get signed URL for file
  const { url: fileUrl } = await getSignedUrl(task.fileId).unwrap();
  
  // Step 3: Render file and form
  setCurrentTask(task);
  setFileUrl(fileUrl);
  
  // Step 4: Auto-save draft every 30s
  const autoSaveInterval = setInterval(() => {
    if (formData) {
      saveDraft(task.id, formData);
    }
  }, 30000);
  
  // Step 5: Submit annotation
  const handleSubmit = async (responses: AnnotationResponse[]) => {
    clearInterval(autoSaveInterval);
    
    await submitTask({
      taskId: task.id,
      userId: currentUser.id,
      responses,
      timeSpent: calculateTimeSpent(),
      notes: formData.notes,
    }).unwrap();
    
    showNotification('Annotation submitted successfully');
    
    // Get next task
    const nextTask = await getNextTask({ userId: currentUser.id }).unwrap();
    setCurrentTask(nextTask);
  };
};
```

### 14.3 Batch Upload

```typescript
const handleBatchUpload = async (file: File) => {
  // Step 1: Parse CSV/JSON file
  const tasks = await parseFile(file);
  
  // Step 2: Validate tasks
  const validation = validateTasks(tasks);
  if (!validation.valid) {
    showErrors(validation.errors);
    return;
  }
  
  // Step 3: Create batch
  const batch = await createBatch({
    projectId: currentProject.id,
    name: file.name,
    description: `Uploaded ${tasks.length} tasks`,
  }).unwrap();
  
  // Step 4: Bulk create tasks
  const result = await createTasksBulk({
    batchId: batch.id,
    tasks: tasks.map(t => ({
      fileUrl: t.fileUrl,
      fileType: t.fileType,
      fileMetadata: t.metadata,
    })),
  }).unwrap();
  
  // Step 5: Show results
  showNotification(
    `Created ${result.created.length} tasks. ${result.errors.length} errors.`,
    result.errors.length > 0 ? 'warning' : 'success'
  );
  
  if (result.errors.length > 0) {
    downloadErrorReport(result.errors);
  }
};
```

---

## 15. Conclusion

This document provides comprehensive context for building a production-ready React UI for the Welo Annotation Platform. The backend services are operational and ready for integration, with clear API specifications, role-based requirements, and technical recommendations.

**Key Priorities**:
1. **Ops Manager Workflow Builder**: Most critical feature for project setup
2. **Question Builder**: Essential for configurable annotation forms
3. **File Rendering Engine**: Core annotation experience
4. **Review Interface**: Multi-annotator consensus and approval workflow

**Backend Readiness**:
- ✅ Project Management: Fully operational
- ✅ Task Management: Fully operational with FIFO queue
- ✅ Workflow Engine: XState integration complete
- ⚠️ Auth Service: Needs implementation (27.5% complete)

The platform is ready for frontend development. Start with the Ops Manager interface for project creation and workflow configuration, then build the annotator portal with file rendering, followed by the review interface.

For questions or clarifications, refer to:
- Scope.md (full requirements)
- REQUIREMENTS_ANALYSIS.md (completion tracking)
- Backend service README files (API details)

---

**Document Maintained By**: Welo Platform Team  
**Last Updated**: February 3, 2026  
**Next Review**: After Phase 1 MVP completion
