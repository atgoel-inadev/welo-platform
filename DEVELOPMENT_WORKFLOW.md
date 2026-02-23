# Development Workflow Guide

## Purpose

This guide establishes best practices for efficient, high-quality feature development on the Welo Data Annotation Platform. Following this workflow will reduce iteration cycles, minimize rebuild time, and prevent common integration issues.

---

## Table of Contents

1. [Root Cause Analysis](#root-cause-analysis)
2. [Contract-First Development Approach](#contract-first-development-approach)
3. [Backend-First Testing Strategy](#backend-first-testing-strategy)
4. [Feature Planning Template](#feature-planning-template)
5. [Development Workflow Steps](#development-workflow-steps)
6. [Common Pitfalls and Solutions](#common-pitfalls-and-solutions)
7. [Quick Wins for Immediate Improvement](#quick-wins-for-immediate-improvement)
8. [Lessons Learned from Batch Assignment Implementation](#lessons-learned-from-batch-assignment-implementation)

---

## Root Cause Analysis

### The Problem: Fragmented, Reactive Development

**Symptom**: Multiple rebuild cycles (6+ rebuilds) to get a feature working, taking 3+ hours when it should take 90 minutes.

**Root Causes**:

1. **No API Contract Definition**: Frontend and backend assumptions about data structures don't match until runtime
2. **Implementation Before Validation**: Writing code before testing backend logic independently
3. **Integration-First Testing**: Discovering issues only when frontend calls backend
4. **Incremental Discovery**: Each fix reveals the next issue because there was no upfront design
5. **TypeORM Cascade Blindspots**: Complex entity relations cause unexpected database constraint violations

**Impact**:
- **6 rebuild cycles** = ~90 seconds total rebuild time (acceptable)
- **3 hours debugging** = Time spent discovering issues reactively (unacceptable)
- **Multiple service calls** = Testing only through UI integration
- **Fragmented implementation** = Losing context between iterations

---

## Contract-First Development Approach

### Philosophy

Define the **API contract** (request/response structure) BEFORE writing any implementation code.

### Benefits

- Frontend and backend teams (or you in both roles) agree on data structures upfront
- Type mismatches caught during design, not runtime
- Clear scope and requirements
- Reduces "I assumed it would return X" problems

### Implementation Steps

1. **Create API Contract Document** (5-10 minutes)

```typescript
// Example: Feature - Task Assignment

// POST /api/v1/tasks/:id/assign
interface AssignTaskRequest {
  taskId: string;      // UUID
  userId: string;      // UUID
  workflowStage: 'ANNOTATION' | 'REVIEW';
  assignedBy?: string; // UUID, optional
}

interface AssignTaskResponse {
  assignment: {
    id: string;
    taskId: string;
    userId: string;
    workflowStage: string;
    status: string;
    assignedAt: string; // ISO 8601
  };
  task: {
    id: string;
    status: string;
    assignedTo: string;
    workflowStage: string;
    fileName: string;
  };
}

// Error Cases
// 400: taskId or userId invalid/missing
// 404: task not found
// 409: task already assigned
```

2. **Share Contract** (if team environment)
   - Review with team
   - Get approval before implementation
   - Store in `docs/api-contracts/` directory

3. **Generate Types** (optional but recommended)
   - Place shared types in `libs/common/src/dto/`
   - Import in both frontend and backend
   - Eliminates duplication and drift

---

## Backend-First Testing Strategy

### Philosophy

Validate backend logic in isolation BEFORE integrating with frontend.

### Why This Matters

- **Backend bugs found in 30 seconds** (curl test) vs **5 minutes** (rebuild + UI navigation)
- **No UI state contamination** - Pure request/response testing
- **Easy to reproduce** - Copy/paste curl commands
- **Fast iteration** - Change code → curl → immediate feedback

### Tools

**PowerShell (Windows)**:
```powershell
# GET request
Invoke-RestMethod -Uri "http://localhost:3003/api/v1/tasks?batchId=$batchId"

# POST request with JSON body
$body = @{
  userId = "650e8400-e29b-41d4-a716-446655440022"
  workflowStage = "ANNOTATION"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3003/api/v1/tasks/$taskId/assign" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

**Bash/Linux**:
```bash
# GET request
curl -X GET "http://localhost:3003/api/v1/tasks?batchId=$batchId"

# POST request with JSON body
curl -X POST "http://localhost:3003/api/v1/tasks/$taskId/assign" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "650e8400-e29b-41d4-a716-446655440022",
    "workflowStage": "ANNOTATION"
  }'
```

### Testing Workflow

1. **Implement backend endpoint** (30-45 min)
2. **Build service once** (`docker compose build <service-name>`)
3. **Test with curl/Invoke-RestMethod** (5-10 min)
4. **Fix any issues** → Rebuild → Re-test
5. **Repeat until backend works perfectly**
6. **ONLY THEN** wire up frontend (20-30 min)

**Result**: Backend validated independently, frontend integration is straightforward.

---

## Feature Planning Template

### When to Use

- Any feature touching multiple components (backend + frontend)
- Features with database schema changes
- Features requiring new API endpoints
- Complex business logic changes

### Template Structure

Create file: `docs/features/FEATURE_NAME.md`

```markdown
# Feature: [Feature Name]

## Overview
Brief description of what this feature does and why.

## Requirements
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

## API Contracts

### Endpoint 1: [Method] [Path]
**Request:**
\`\`\`typescript
interface RequestDto {
  field1: string;
  field2: number;
}
\`\`\`

**Response:**
\`\`\`typescript
interface ResponseDto {
  result: string;
}
\`\`\`

**Error Cases:**
- 400: Invalid input
- 404: Resource not found

## Database Changes

### New Tables
- `table_name`: Description

### Schema Migrations
- Migration file: `YYYYMMDDHHMMSS_migration_name.ts`
- Changes: Add columns, indexes, constraints

### Entity Changes
- Entity: `Task`
- Fields added: `newField: string`
- Relations: `@ManyToOne(() => User)`

## Implementation Plan

### Phase 1: Backend (Estimated: 1 hour)
- [ ] Create DTOs in `src/dto/`
- [ ] Update entity if needed
- [ ] Implement service method
- [ ] Create controller endpoint
- [ ] Add validation
- [ ] Write unit tests (optional)

### Phase 2: Backend Testing (Estimated: 15 min)
- [ ] Build service: `docker compose build <service>`
- [ ] Test happy path with curl
- [ ] Test error cases
- [ ] Verify database state

### Phase 3: Frontend (Estimated: 45 min)
- [ ] Update TypeScript interfaces
- [ ] Create/update service method
- [ ] Update UI components
- [ ] Add error handling
- [ ] Test in browser

### Phase 4: Integration Testing (Estimated: 15 min)
- [ ] End-to-end happy path
- [ ] Error handling validation
- [ ] Edge cases

## Testing Commands

\`\`\`powershell
# Test endpoint
$body = @{ field = "value" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3003/api/v1/endpoint" -Method Post -Body $body -ContentType "application/json"
\`\`\`

## Rollback Plan
If something goes wrong:
- Revert commit: `git revert <commit-hash>`
- Database rollback: `npm run migration:revert`

## Success Criteria
- [ ] All API tests pass
- [ ] Frontend displays data correctly
- [ ] No console errors
- [ ] Database constraints satisfied
```

---

## Development Workflow Steps

### Step 1: Plan (15-20 minutes)

**Actions:**
1. Create feature planning document using template above
2. Define API contracts with exact TypeScript interfaces
3. Identify database changes needed
4. List testing commands
5. Break work into phases

**Output:** Feature plan document in `docs/features/`

---

### Step 2: Implement Backend (30-60 minutes)

**Actions:**
1. Create/update DTOs with validation decorators
2. Update TypeORM entities if schema changes needed
3. Implement service method with business logic
4. Create controller endpoint with Swagger docs
5. Handle error cases explicitly

**Output:** Working backend code (not yet tested)

---

### Step 3: Test Backend Independently (10-20 minutes)

**Actions:**
1. Build service: `docker compose build <service-name>`
2. Start service: `docker compose up -d <service-name>`
3. Run curl/PowerShell tests from feature plan
4. Test happy path
5. Test error cases (invalid input, not found, etc.)
6. Verify database state with SQL queries if needed

**Output:** Backend validated and working perfectly

**Critical:** Do NOT proceed to frontend until backend is 100% working.

---

### Step 3.5: Regenerate API Clients (5 minutes)

**MANDATORY** after ANY backend API changes (new endpoints, method renames, DTO changes).

**Actions:**
```bash
# Ensure all services are running
cd welo-platform
docker compose ps

# Navigate to frontend
cd ../welo-platform-ui

# Regenerate API clients from live Swagger specs
npm run generate:api
```

**What This Does:**
- Fetches OpenAPI/Swagger specs from all running backend services
- Generates fully-typed API client functions in `src/generated/`
- Each service gets its own file:
  - `authApi.ts` (port 3002)
  - `workflowApi.ts` (port 3001)
  - `taskApi.ts` (port 3003)
  - `projectApi.ts` (port 3004)
  - `annotationQaApi.ts` (port 3005)

**Benefits:**
- ✅ **Compile-Time Type Safety**: If backend renames `fetchProjectById` → `getProject`, TypeScript will error at compile time
- ✅ **Auto-Complete**: Full IntelliSense for all backend endpoints
- ✅ **Single Source of Truth**: Backend Swagger spec drives frontend types
- ✅ **No Manual Sync**: Zero manual interface copying

**Generated Functions Usage:**
```typescript
// Import generated function directly
import { getTasksTaskId, updateTasksTaskId } from '../generated/taskApi';

// Use it - auth tokens and interceptors applied automatically
const task = await getTasksTaskId(taskId);
```

**Prerequisites:**
- All backend services must be running
- Backend must have Swagger decorators (`@ApiProperty()`, `@ApiResponse()`)
- Verify Swagger UI: `http://localhost:<port>/api/docs`

**When to Run:**
- ✅ After adding new backend endpoints
- ✅ After renaming backend methods
- ✅ After changing request/response DTOs
- ✅ After modifying validation rules
- ✅ Before implementing frontend changes that use backend APIs

**Configuration:**
- Orval config: `welo-platform-ui/orval.config.ts`
- Auth mutators: `welo-platform-ui/src/lib/mutators.ts`

**Output:** Type-safe API client functions ready for frontend use

---

### Step 4: Implement Frontend (20-45 minutes)

**Actions:**
1. Update TypeScript interfaces in `src/types/` or service files
2. Create/update service method in `src/services/`
3. Update UI components (pages, forms, tables)
4. Add error handling and user feedback
5. Add loading states

**Output:** Frontend code using working backend

---

### Step 5: Integration Testing (10-15 minutes)

**Actions:**
1. Test end-to-end flow in browser
2. Verify error handling shows user-friendly messages
3. Test edge cases (empty states, invalid input)
4. Check browser console for errors
5. Verify data persistence

**Output:** Fully working, tested feature

---

### Step 6: Document and Commit (5 minutes)

**Actions:**
1. Update README or relevant docs
2. Add testing commands to project docs
3. Commit with descriptive message
4. Update feature plan with "Completed" status

---

## Common Pitfalls and Solutions

### Pitfall 1: TypeORM Cascade Updates Causing NULL Constraints

**Problem:**
```typescript
// ❌ WRONG: Loading task with relations, then saving
const task = await taskRepository.findOne({
  where: { id },
  relations: ['assignments']
});
task.assignments.push(newAssignment);
await taskRepository.save(task); // Cascade update nullifies task_id!
```

**Solution:**
```typescript
// ✅ CORRECT: Use insert query builder for new records
await assignmentRepository.createQueryBuilder()
  .insert()
  .values(assignment)
  .execute();

// ✅ CORRECT: Fetch entity WITHOUT relations before update
const taskToUpdate = await taskRepository.findOne({ where: { id } });
taskToUpdate.status = TaskStatus.ASSIGNED;
await taskRepository.save(taskToUpdate);
```

**Prevention:** Always use insert query builder for new child entities. Fetch parent entities without relations when updating parent-only fields.

---

### Pitfall 2: API Response Structure Mismatch

**Problem:**
```typescript
// Backend returns: { tasks: [...], total: 20, page: 1 }
// Frontend expects: [...]
const tasks = await api.get('/tasks'); // ❌ Crashes
```

**Solution:**
```typescript
// ✅ Define contract upfront
interface TaskListResponse {
  tasks: Task[];
  total: number;
  page: number;
  pageSize: number;
}

// Backend controller
return { tasks, total, page, pageSize };

// Frontend service
const response = await api.get<TaskListResponse>('/tasks');
return response.tasks; // Extract array
```

**Prevention:** Use shared TypeScript types from `libs/common/src/dto/` imported by both backend and frontend.

---

### Pitfall 3: Missing Computed Fields

**Problem:**
```typescript
// Task entity has assignmentId (FK) but UI needs user name
// Frontend expects: task.assignedTo = "user-uuid"
// Backend returns: task.assignmentId = 123
```

**Solution:**
```typescript
// ✅ Add transformation in backend list method
async listTasks(): Promise<Task[]> {
  const tasks = await this.taskRepository.find({
    relations: ['assignments', 'assignments.user']
  });
  
  return tasks.map(task => {
    const activeAssignment = task.assignments?.find(
      a => a.status === 'ASSIGNED' || a.status === 'IN_PROGRESS'
    );
    
    return {
      ...task,
      assignedTo: activeAssignment?.userId || null,
      assignedToName: activeAssignment?.user?.name || null,
      workflowStage: activeAssignment?.workflowStage || null
    };
  });
}
```

**Prevention:** Define exact response structure in API contract including computed fields.

---

### Pitfall 4: Testing Only Through UI

**Problem:**
- Make backend change
- Rebuild service (15 seconds)
- Navigate through UI (30 seconds)
- Fill form, submit (20 seconds)
- See error (immediate)
- **Total: ~65 seconds per iteration**

**Solution:**
- Make backend change
- Rebuild service (15 seconds)
- Run curl command (2 seconds)
- **Total: ~17 seconds per iteration**

**Time Savings:** 75% faster feedback loop

**Prevention:** Create `scripts/test-apis.ps1` with commonly used curl commands.

---

### Pitfall 5: Enum Case Sensitivity

**Problem:**
```typescript
// DTO receives: workflowStage = "annotation" (lowercase)
// Enum expects: WorkflowStage.ANNOTATION (uppercase)
assignment.workflowStage = dto.workflowStage; // ❌ Fails validation
```

**Solution:**
```typescript
// ✅ Normalize to uppercase
assignment.workflowStage = WorkflowStage[dto.workflowStage.toUpperCase()];

// ✅ OR use class-validator transform
@IsEnum(WorkflowStage)
@Transform(({ value }) => value.toUpperCase())
workflowStage: WorkflowStage;
```

**Prevention:** Use validation decorators and transformers consistently.

---

## Quick Wins for Immediate Improvement

### Win 1: Create API Testing Script (30 minutes investment)

**File:** `scripts/test-batch-apis.ps1`

```powershell
# Configuration
$baseUrl = "http://localhost:3003/api/v1"
$batchId = "36818a3a-2255-4716-96c9-dc76da06f7eb"
$taskId = "a3a6dc41-20fc-4312-be63-606494eb48e0"
$userId = "650e8400-e29b-41d4-a716-446655440022"

Write-Host "=== Testing Batch APIs ===" -ForegroundColor Green

# Test 1: List tasks
Write-Host "`n1. GET /tasks?batchId=$batchId" -ForegroundColor Yellow
$tasks = Invoke-RestMethod -Uri "$baseUrl/tasks?batchId=$batchId"
Write-Host "Found $($tasks.total) tasks"
$tasks.tasks[0] | Select-Object id, status, assignedTo, workflowStage | Format-List

# Test 2: Assign task
Write-Host "`n2. POST /tasks/:id/assign" -ForegroundColor Yellow
$assignBody = @{
  userId = $userId
  workflowStage = "ANNOTATION"
} | ConvertTo-Json

$assigned = Invoke-RestMethod -Uri "$baseUrl/tasks/$taskId/assign" `
  -Method Post -Body $assignBody -ContentType "application/json"
Write-Host "Assigned to: $($assigned.assignment.userId)"

# Test 3: Unassign task
Write-Host "`n3. POST /tasks/:id/unassign" -ForegroundColor Yellow
$unassigned = Invoke-RestMethod -Uri "$baseUrl/tasks/$taskId/unassign" `
  -Method Post -ContentType "application/json"
Write-Host "Task status: $($unassigned.task.status)"

Write-Host "`n=== All Tests Passed ===" -ForegroundColor Green
```

**Usage:** Run before ANY UI work on batch features.

**Time Saved:** 30-45 minutes per feature.

---

### Win 2: Shared Type Definitions (1 hour investment)

**File:** `libs/common/src/dto/batch-api.dto.ts`

```typescript
// Shared between backend and frontend
export interface TaskDto {
  id: string;
  batchId: string;
  projectId: string;
  status: TaskStatus;
  assignedTo: string | null;
  workflowStage: WorkflowStage | null;
  fileName: string;
  fileMetadata: {
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AssignTaskRequest {
  userId: string;
  workflowStage: 'ANNOTATION' | 'REVIEW';
}

export interface AssignTaskResponse {
  assignment: {
    id: string;
    taskId: string;
    userId: string;
    workflowStage: string;
    status: string;
  };
  task: TaskDto;
}
```

**Backend Usage:**
```typescript
import { TaskDto, AssignTaskResponse } from '@app/common/dto/batch-api.dto';

@Post(':id/assign')
async assignTask(@Body() dto: AssignTaskRequest): Promise<AssignTaskResponse> {
  // Implementation
}
```

**Frontend Usage:**
```typescript
import { TaskDto, AssignTaskRequest } from '@/types/api'; // Re-export from common

export const assignTask = async (
  taskId: string, 
  request: AssignTaskRequest
): Promise<AssignTaskResponse> => {
  return taskManagementApi.post(`/tasks/${taskId}/assign`, request);
};
```

**Benefit:** Eliminates interface mismatches entirely.

---

### Win 3: Feature Planning Template (15 minutes investment)

**File:** `docs/FEATURE_PLAN_TEMPLATE.md`

Copy the template from the "Feature Planning Template" section above.

**Usage:** For every feature, copy template to `docs/features/feature-name.md` and fill it out BEFORE coding.

**Time Saved:** 60-70% reduction in iteration cycles.

---

## Lessons Learned from Batch Assignment Implementation

### Timeline Analysis

**What Happened:**
- **Total Time:** ~3 hours
- **Rebuild Cycles:** 6
- **Root Issues:** 
  1. API response structure mismatch (wrapper object vs array)
  2. Interface mismatch (assignmentCounts vs assignmentBreakdown)
  3. Missing computed fields (assignedTo, workflowStage)
  4. TypeORM cascade updates causing NULL constraints
  5. Enum case sensitivity
  6. Wrong service routing (project-management vs task-management)

**Iterations:**
1. Fixed API response extraction → 1 rebuild
2. Added computed fields → 1 rebuild
3. Fixed cascade issue (attempt 1) → 1 rebuild
4. Fixed cascade issue (attempt 2) → 1 rebuild
5. Fixed cascade issue (final) → 1 rebuild
6. Fixed unassign logic → 1 rebuild

**Total Rebuild Time:** ~90 seconds (acceptable)
**Total Discovery/Diagnosis Time:** ~2.5 hours (unacceptable)

---

### What Should Have Happened

**With Contract-First Approach:**

**Step 1: Define Contract (15 min)**
```typescript
// docs/features/batch-assignment.md
interface TaskListResponse {
  tasks: Array<{
    id: string;
    assignedTo: string | null;
    workflowStage: 'ANNOTATION' | 'REVIEW' | null;
    fileName: string;
  }>;
  total: number;
}

interface AssignTaskRequest {
  userId: string;
  workflowStage: 'ANNOTATION' | 'REVIEW';
}
```

**Step 2: Implement Backend (45 min)**
- Create DTOs matching contract
- Implement service with transformation
- Plan TypeORM queries (insert vs save)
- Handle enum case normalization

**Step 3: Test Backend (15 min)**
```powershell
# Would catch ALL issues immediately
$response = Invoke-RestMethod "http://localhost:3003/api/v1/tasks?batchId=$batchId"
$response.tasks[0] | ConvertTo-Json
# Verify: assignedTo present, workflowStage present, correct structure
```

**Step 4: Fix All Issues (30 min)**
- Fix query to join assignments
- Fix transformation
- Fix cascade issue (discovered via curl test)
- **Rebuild once: 15 seconds**

**Step 5: Implement Frontend (30 min)**
- Update interfaces to match contract
- Wire up service methods
- Works on first try (backend validated)

**Total Time:** ~2 hours (vs 3 hours actual)
**Rebuilds:** 1-2 (vs 6 actual)
**Time Saved:** ~33%

---

### Key Takeaways

1. **API Contract First:** 15 minutes planning saves hours debugging
2. **Backend Testing:** Curl tests find issues 10x faster than UI testing
3. **TypeORM Gotchas:** Insert query builder for new entities, fetch without relations for updates
4. **Shared Types:** Prevent mismatch issues entirely
5. **Incremental Discovery:** Result of no upfront design

---

## Recommended Workflow for Next Feature

### Example: Auto-Assign End-to-End Testing

**Current State:** Backend endpoint exists, frontend wired, not tested.

**Recommended Approach:**

1. **Define Expected Behavior (10 min)**
   ```markdown
   # Feature: Auto-Assign Tasks
   
   ## API Contract
   POST /api/v1/batches/:id/auto-assign
   
   Request:
   {
     "method": "ROUND_ROBIN" | "LEAST_LOADED",
     "annotatorIds": ["user-1", "user-2"],
     "tasksPerAnnotator"?: number
   }
   
   Response:
   {
     "assigned": 15,
     "assignments": [
       { "taskId": "...", "userId": "...", "workflowStage": "ANNOTATION" }
     ]
   }
   ```

2. **Test Backend (15 min)**
   ```powershell
   $batchId = "36818a3a-2255-4716-96c9-dc76da06f7eb"
   $body = @{
     method = "ROUND_ROBIN"
     annotatorIds = @(
       "650e8400-e29b-41d4-a716-446655440022",
       "650e8400-e29b-41d4-a716-446655440023"
     )
   } | ConvertTo-Json
   
   Invoke-RestMethod -Uri "http://localhost:3004/api/v1/batches/$batchId/auto-assign" `
     -Method Post -Body $body -ContentType "application/json"
   ```
   
   **Verify:**
   - Tasks get assigned
   - Distribution is correct
   - Database state updated

3. **Test Frontend (10 min)**
   - Click Auto-Assign button
   - Verify request matches contract
   - Verify UI updates correctly

**Total Time:** 35 minutes
**Rebuilds:** 0 (backend already implemented)
**Result:** Working feature, validated approach

---

## Summary

### Before (Reactive Approach)
1. Write code based on assumptions
2. Integrate frontend and backend
3. Find error in UI
4. Debug, fix, rebuild
5. Find next error
6. Repeat 5-10 times
7. **Result:** 3+ hours, 6+ rebuilds

### After (Contract-First Approach)
1. Define API contract (15 min)
2. Implement backend (45 min)
3. Test backend with curl (15 min)
4. Fix all issues with 1-2 rebuilds (30 min)
5. Implement frontend (30 min)
6. Integration testing (15 min)
7. **Result:** ~2 hours, 1-2 rebuilds

### Time Savings: 33-50%

### Additional Benefits
- Fewer context switches
- Clear requirements
- Testable components
- Maintainable code
- Reduced frustration

---

## Next Steps

1. **Create feature planning template** → `docs/FEATURE_PLAN_TEMPLATE.md`
2. **Create API testing scripts** → `scripts/test-batch-apis.ps1`, `scripts/test-task-apis.ps1`
3. **Set up shared types** → `libs/common/src/dto/` (if monorepo structure allows)
4. **Practice on next feature** → Use auto-assign testing as first test case
5. **Refine and iterate** → Adjust workflow based on what works for you

**Success Metric:** Complete next feature with 1 build instead of 6.
