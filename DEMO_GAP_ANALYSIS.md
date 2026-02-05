# Demo Gap Analysis & Implementation Plan

**Date:** February 5, 2026  
**Target:** Today's Demo  
**Scenario:** Ops Manager creates project → uploads files → tasks distributed to annotators → state transitions → review → approval

---

## Executive Summary

### ✅ What's Working
1. **Project Creation** - Ops Manager can create projects with questions ✅
2. **Authentication** - Role-based auth with test users (admin, ops, annotator, reviewer) ✅
3. **Backend Services** - All microservices deployed and running ✅
4. **UI Builder** - Complete UI configuration system ✅
5. **Task Rendering** - UnifiedTaskRenderer for annotators/reviewers ✅
6. **Workflow Engine** - XState-based workflow system ✅

### ❌ Critical Gaps for Demo
1. **Batch Upload UI** - No frontend for file upload ❌
2. **User Management** - Can't create/assign annotators from UI ❌
3. **Task List Views** - Annotator/Reviewer task lists exist but need batch context ❌
4. **File Storage** - No local file storage handler ❌
5. **State Transitions** - Backend exists, frontend integration incomplete ❌
6. **Task Assignment** - Auto-assignment logic exists but no manual UI ❌

---

## Detailed Gap Analysis

### 1. Batch Upload & File Management

#### Current State
- ✅ **Backend**: `BatchController.allocateFiles()` exists (project-management service)
- ✅ **Backend**: `BatchService.allocateFiles()` creates tasks from file list
- ✅ **Backend**: File allocation endpoints ready: `POST /api/v1/batches/:id/allocate-files`
- ❌ **Frontend**: No `BatchUpload.tsx` component
- ❌ **Frontend**: No file upload handler
- ❌ **Storage**: No local file storage configured

#### What's Missing
1. **Frontend Component**: `BatchUpload.tsx` page
   - File picker (CSV/JSON upload)
   - File list parser
   - File URL mapping (local storage path)
   - Batch creation + task allocation
   - Progress tracking
   - Error display

2. **File Storage Strategy**:
   ```
   Option A (Quick - For Demo):
   - Store files in public/uploads/ directory
   - Serve via Vite static assets
   - File URLs: http://localhost:5173/uploads/file.jpg
   
   Option B (Production-like):
   - Use multer in project-management service
   - POST /api/v1/files/upload endpoint
   - Store in docker/uploads volume
   - Return file URLs
   ```

3. **API Integration**:
   ```typescript
   // services/batchService.ts (NEW)
   createBatch(projectId, name, description)
   allocateFiles(batchId, files[])
   getBatchStatistics(batchId)
   ```

#### Implementation Priority: **🔴 CRITICAL**
**Estimated Time**: 2-3 hours

---

### 2. User Management

#### Current State
- ✅ **Backend**: Auth service with user registration
- ✅ **Backend**: Mock users exist (admin, ops, annotator, reviewer)
- ✅ **Database**: Users table exists
- ❌ **Frontend**: No user management UI
- ❌ **Frontend**: Can't create annotators/reviewers from UI
- ❌ **Frontend**: Can't assign users to projects

#### What's Missing
1. **User Management Page**: `UserManagement.tsx`
   - List all users (with role filter)
   - Create new user (email, name, role)
   - Update user status (active/inactive)
   - Delete user
   
2. **Project Team Assignment**:
   - Assign annotators to project
   - Assign reviewers to project
   - Set user quotas per project

3. **Quick User Creation** (Inline):
   - Add user while creating batch
   - Quick annotator registration

#### Current Workaround
- Use auth service API directly
- Create users via Postman/cURL
- Use existing test accounts

#### Implementation Priority: **🟡 MEDIUM** (Can use test accounts for demo)
**Estimated Time**: 2-3 hours

---

### 3. Task Distribution & Assignment

#### Current State
- ✅ **Backend**: Auto-assignment algorithms (round-robin, workload-based)
- ✅ **Backend**: `BatchService.autoAssignTasks()` exists
- ✅ **Backend**: Manual assignment: `POST /api/v1/batches/assign-task`
- ✅ **Backend**: Pull-based: `POST /api/v1/batches/pull-next-task`
- ❌ **Frontend**: No manual assignment UI
- ❌ **Frontend**: No assignment monitoring

#### What Works
- Backend can auto-assign when `allocateFiles()` called with `autoAssign: true`
- Annotators can pull next task from queue
- Round-robin distribution works

#### What's Missing
1. **Assignment Controls** (in Batch view):
   - Auto-assign button
   - Manual assign dropdown (select user)
   - Assignment algorithm selector
   - View current assignments

2. **Assignment Monitoring**:
   - Who has what tasks
   - Assignment status
   - Reassignment capability

#### Current Workaround
- Use `autoAssign: true` when creating batch
- Backend automatically distributes

#### Implementation Priority: **🟡 MEDIUM** (Auto-assignment works)
**Estimated Time**: 1-2 hours

---

### 4. Task List Views (Annotator/Reviewer)

#### Current State
- ✅ **Frontend**: `TaskQueue.tsx` exists for annotators
- ✅ **Frontend**: `ReviewQueue.tsx` exists for reviewers
- ✅ **Frontend**: UnifiedTaskRenderer works
- ⚠️ **Integration**: Task lists don't show batch context
- ⚠️ **Integration**: Need to filter by project

#### What Works
- Annotators can see assigned tasks
- Reviewers can see review queue
- Task rendering with file viewer + questions

#### What's Missing
1. **Batch Context**:
   - Show which batch task belongs to
   - Filter tasks by batch
   - Batch progress indicator

2. **Task Filtering**:
   - Filter by project
   - Filter by status
   - Filter by priority

3. **Task Actions**:
   - Claim/Release task
   - Skip task
   - Report issue

#### Implementation Priority: **🟢 LOW** (Basic functionality exists)
**Estimated Time**: 1 hour

---

### 5. State Transitions & Workflow

#### Current State
- ✅ **Backend**: XState workflow engine exists
- ✅ **Backend**: State transitions tracked in database
- ✅ **Backend**: `TaskRenderingService.saveAnnotation()` exists
- ✅ **Backend**: `TaskRenderingService.saveReview()` exists
- ✅ **Frontend**: UnifiedTaskRenderer submits annotations
- ⚠️ **Integration**: State transitions need testing

#### What Works
- Workflow state machine defined
- Task status updates on annotation submit
- Review approval/rejection

#### What's Missing
1. **Status Visibility**:
   - Show current task state
   - Show workflow progress
   - Show transition history

2. **State Actions**:
   - Manual state override (for ops)
   - Bulk state changes
   - State rollback

#### Implementation Priority: **🟢 LOW** (Core flow works)
**Estimated Time**: 30 minutes

---

### 6. File Rendering & Viewer

#### Current State
- ✅ **Frontend**: `FileViewer.tsx` component exists
- ✅ **Frontend**: Supports multiple file types (image, video, audio, text, CSV, PDF)
- ✅ **Frontend**: Used in UnifiedTaskRenderer
- ⚠️ **Storage**: Need to configure file serving

#### What Works
- File viewer renders correctly
- Supports local and remote URLs

#### What's Missing
- Local file storage configuration
- File upload handling

#### Implementation Priority: **🔴 CRITICAL** (Part of batch upload)
**Estimated Time**: Included in batch upload time

---

## Implementation Plan for Demo

### Phase 1: Critical Path (Must Have) - 3 hours

#### 1.1 Batch Upload Component (1.5 hours)
**File**: `welo-platform-ui/src/pages/ops/BatchUpload.tsx`

```typescript
// Component Structure
- File upload area (drag & drop or file picker)
- CSV/JSON parser
- File list preview
- Batch configuration (name, description, priority)
- Auto-assignment toggle
- Submit button
- Progress/Success feedback
```

**Approach**: Quick & Simple
- Accept CSV with columns: `file_name, file_type, file_url`
- Store files in `public/uploads/` (for demo)
- Generate file URLs: `http://localhost:5173/uploads/{filename}`
- Call backend API to create batch + allocate files

**Implementation**:
```typescript
// 1. Create BatchUpload.tsx
// 2. Add CSV parser (Papa Parse library)
// 3. Create batchService.ts API client
// 4. Add route: /ops/batches/upload
// 5. Link from OpsDashboard
```

#### 1.2 File Storage Setup (30 minutes)
- Create `welo-platform-ui/public/uploads/` directory
- Add sample files for demo:
  - sample1.jpg, sample2.jpg, sample3.jpg
  - sample1.txt, sample2.txt
- Create demo CSV: `demo-batch.csv`

#### 1.3 Batch List & Statistics (1 hour)
**File**: `welo-platform-ui/src/pages/ops/BatchList.tsx`

```typescript
// Component Structure
- List of batches for project
- Batch statistics (total, completed, pending)
- Task distribution view
- Assignment status
- Link to upload more files
```

---

### Phase 2: Enhanced Experience (Nice to Have) - 2 hours

#### 2.1 Task List Improvements (1 hour)
- Add batch context to TaskQueue
- Add batch filter dropdown
- Show batch name in task cards
- Add batch progress bar

#### 2.2 User Quick-Add (1 hour)
- Inline user creation in batch upload
- Quick annotator registration form
- Assign users while uploading

---

### Phase 3: Polish (If Time Permits) - 1 hour

#### 3.1 Manual Assignment UI
- Manual assign button in batch view
- User selector dropdown
- Reassignment capability

#### 3.2 Workflow Visualization
- Show task state visually
- Workflow progress timeline
- State transition history

---

## Demo Flow Script

### Setup (Before Demo)
1. ✅ Start all Docker services
2. ✅ Login as ops@welo.com / Test123!
3. ✅ Create test project with annotation questions
4. ✅ Prepare demo files in public/uploads/
5. ✅ Prepare demo CSV file

### Demo Steps

#### Step 1: Ops Manager Creates Project (2 minutes)
- Navigate to `/ops/projects/create`
- Fill project details:
  - Name: "Image Classification Demo"
  - Customer: Select existing
  - Type: IMAGE_CLASSIFICATION
- Add annotation questions:
  - Q1: "What object is in the image?" (SINGLE_SELECT)
  - Options: Cat, Dog, Bird, Other
  - Q2: "Image quality" (RATING, 1-5 stars)
- Configure workflow:
  - 1 annotator per task
  - 1 review level
- Create project ✅

#### Step 2: Ops Manager Uploads Batch (3 minutes)
- Navigate to `/ops/batches/upload`
- Select project: "Image Classification Demo"
- Upload CSV file:
  ```csv
  file_name,file_type,file_url
  cat1.jpg,IMAGE,http://localhost:5173/uploads/cat1.jpg
  dog1.jpg,IMAGE,http://localhost:5173/uploads/dog1.jpg
  bird1.jpg,IMAGE,http://localhost:5173/uploads/bird1.jpg
  ```
- Batch name: "Demo Batch 001"
- Enable auto-assignment ✅
- Submit
- Show success: "3 tasks created, 3 assigned"

#### Step 3: Annotator Annotates Tasks (3 minutes)
- Logout, login as annotator@welo.com / Test123!
- Navigate to `/annotate/queue`
- See assigned tasks (3 tasks)
- Click first task
- View: UnifiedTaskRenderer displays:
  - File viewer (cat1.jpg)
  - Question 1: Select "Cat"
  - Question 2: Rate 5 stars
- Submit annotation ✅
- Return to queue (2 tasks remaining)

#### Step 4: State Transition Check (1 minute)
- Task status: QUEUED → SUBMITTED
- Task moves to review queue

#### Step 5: Reviewer Reviews Task (2 minutes)
- Logout, login as reviewer@welo.com / Test123!
- Navigate to `/review/queue`
- See review tasks (1 task)
- Click task
- View: UnifiedTaskRenderer displays:
  - File viewer (cat1.jpg)
  - Previous annotation (Cat, 5 stars)
  - Review decision options
- Approve annotation ✅
- Task status: SUBMITTED → APPROVED

#### Step 6: Batch Progress (1 minute)
- Login as ops@welo.com
- Navigate to batch statistics
- View:
  - Total: 3 tasks
  - Completed: 1 task
  - In Progress: 1 task
  - Pending: 1 task
  - Completion: 33%

**Total Demo Time: 12 minutes**

---

## Technical Decisions

### File Storage (For Demo)
**Decision**: Use Vite's public folder
- **Pros**: Zero setup, works immediately, fast
- **Cons**: Not production-ready, no upload handling
- **Justification**: Demo focus, can upgrade later

### Auto-Assignment
**Decision**: Use existing round-robin backend logic
- **Pros**: Already implemented and tested
- **Cons**: No manual control
- **Justification**: Sufficient for demo, backend is solid

### User Management
**Decision**: Use existing test accounts
- **Pros**: No implementation needed, users already exist
- **Cons**: Can't demo user creation
- **Justification**: Not core to workflow demo

---

## Implementation Checklist

### Pre-Demo Setup
- [ ] Verify all Docker containers running
- [ ] Verify test users exist (ops, annotator, reviewer)
- [ ] Create sample project
- [ ] Prepare demo files (cat1.jpg, dog1.jpg, bird1.jpg)
- [ ] Prepare demo CSV file
- [ ] Test complete flow end-to-end

### Critical Implementation (Must Have)
- [ ] Create `BatchUpload.tsx` component
- [ ] Add CSV parser (Papa Parse)
- [ ] Create `batchService.ts` API client
- [ ] Add route `/ops/batches/upload`
- [ ] Create sample files in `public/uploads/`
- [ ] Create `BatchList.tsx` component
- [ ] Add batch statistics display
- [ ] Test file URL generation
- [ ] Test batch creation API
- [ ] Test auto-assignment

### Enhanced Features (Nice to Have)
- [ ] Add batch context to TaskQueue
- [ ] Add batch filter dropdown
- [ ] Inline user creation in batch upload
- [ ] Manual assignment UI
- [ ] Workflow visualization

### Testing
- [ ] Test complete demo flow
- [ ] Test error handling
- [ ] Test with multiple annotators
- [ ] Test reviewer approval/rejection
- [ ] Test batch statistics accuracy

---

## API Endpoints Reference

### Already Implemented (Backend)

#### Batch Management
```
POST   /api/v1/batches
Body: { projectId, name, description, priority }
Response: { id, name, status, totalTasks, ... }

POST   /api/v1/batches/:id/allocate-files
Body: { 
  files: [{ fileName, fileType, fileUrl, externalId }],
  taskType, priority, dueDate,
  autoAssign: true,
  assignmentMethod: "AUTO_ROUND_ROBIN"
}
Response: [ Task[] ]

GET    /api/v1/batches/:id/statistics
Response: {
  totalTasks, completedTasks, inProgressTasks,
  queuedTasks, assignmentCounts, ...
}
```

#### Task Rendering
```
GET    /tasks/:id/render-config?userId=xxx
Response: { taskId, viewType, taskData, uiConfiguration, annotationQuestions, ... }

POST   /tasks/:id/annotation?userId=xxx
Body: { responses: [{questionId, response}], extraWidgetData }

POST   /tasks/:id/review?userId=xxx
Body: { decision, comments, qualityScore, extraWidgetData }
```

#### Authentication
```
POST   /api/v1/auth/login
Body: { email, password }
Response: { accessToken, refreshToken, user, expiresIn }

POST   /api/v1/auth/register
Body: { email, password, name, role }
Response: { accessToken, refreshToken, user, expiresIn }
```

---

## Risk Assessment

### High Risk
1. **File serving not working** - Mitigation: Test with absolute URLs first
2. **CSV parsing errors** - Mitigation: Use Papa Parse library (robust)
3. **Auto-assignment fails** - Mitigation: Backend already tested, verify user eligibility

### Medium Risk
1. **Task list doesn't refresh** - Mitigation: Add manual refresh button
2. **State transitions not visible** - Mitigation: Add status badges to UI
3. **Batch statistics incorrect** - Mitigation: Backend logic is solid

### Low Risk
1. **UI polish issues** - Mitigation: Focus on functionality over aesthetics
2. **Error messages not clear** - Mitigation: Add console logs for debugging

---

## Fallback Plans

### If Batch Upload Can't Be Completed
- **Fallback**: Use Postman to create batch + allocate files
- **Demo Script**: "Behind the scenes, ops manager would upload files here"
- **Manual Steps**: Pre-create tasks before demo

### If Auto-Assignment Fails
- **Fallback**: Use manual assignment API
- **Demo Script**: "System can auto-assign or manually assign"
- **Manual Steps**: Assign tasks via Postman before demo

### If File Viewer Fails
- **Fallback**: Use sample URLs from internet (e.g., placekitten.com)
- **Demo Script**: "In production, files would be stored securely"

---

## Success Criteria

### Minimum Viable Demo
✅ **Must Have**:
1. Create project with questions
2. Upload batch (via UI or Postman)
3. Tasks distributed to annotator
4. Annotator can view and submit task
5. Reviewer can review and approve
6. State transitions visible

### Enhanced Demo
✅ **Nice to Have**:
1. Batch upload via UI
2. Batch statistics visible
3. Multiple annotators working
4. Task filtering
5. Manual assignment

---

## Post-Demo Roadmap

### Immediate (This Week)
1. Implement production file upload (multer + S3/MinIO)
2. Complete user management UI
3. Add manual assignment UI
4. Enhanced task filtering

### Short Term (Next Sprint)
1. Skill-based assignment
2. Task priority management
3. Bulk operations
4. Export functionality

### Long Term
1. Analytics dashboard
2. Quality metrics
3. Performance tracking
4. Advanced workflow customization

---

## Conclusion

### What We Can Demo Today (Realistic)
- ✅ Project creation with annotation questions
- ⚠️ Batch upload (need to build, 1.5 hours)
- ✅ Auto-assignment (backend ready)
- ✅ Annotator workflow (works with UnifiedTaskRenderer)
- ✅ Reviewer workflow (works with UnifiedTaskRenderer)
- ✅ State transitions (backend ready)
- ⚠️ Batch statistics (need UI, 1 hour)

### Priority Focus
1. **Build BatchUpload.tsx** (1.5 hours) - CRITICAL
2. **Setup demo files** (30 minutes) - CRITICAL
3. **Build BatchList.tsx** (1 hour) - HIGH
4. **Test complete flow** (30 minutes) - CRITICAL

**Total Implementation Time**: ~3.5 hours

### Recommendation
- **Start immediately with BatchUpload.tsx**
- Use existing test accounts (skip user management)
- Focus on happy path (error handling minimal)
- Prepare fallback (Postman) if timing is tight
- Test, test, test before demo

---

**Status**: Ready to implement  
**Next Step**: Start coding BatchUpload.tsx  
**ETA**: 3.5 hours until demo-ready
