# Development Workflow Cheat Sheet

Quick reference for efficient feature development on Welo Data Annotation Platform.

---

## 🎯 The Golden Rule

**Backend First → Test Backend → Then Frontend**

Never integrate untested backend code with frontend.

---

## 📋 Feature Development Checklist

```
[ ] 1. Define API contract (15 min)
[ ] 2. Implement backend (45 min)
[ ] 3. Build service once
[ ] 4. Test backend with curl (15 min)
[ ] 5. Fix issues → rebuild → retest
[ ] 6. Regenerate API clients (5 min) ⭐ NEW
[ ] 7. Implement frontend (30 min)
[ ] 8. Integration test (15 min)
```

**Total Time:** ~2 hours | **Rebuilds:** 1-2

---

## 🔧 Essential Commands

### Docker Service Management

```powershell
# Build ONLY the service you changed
docker compose build <service-name>

# Restart ONLY that service
docker compose up -d <service-name>

# View logs
docker compose logs -f <service-name>

# ❌ NEVER (destroys everything)
docker compose down
```

### API Testing (PowerShell)

```powershell
# GET request
Invoke-RestMethod -Uri "http://localhost:3003/api/v1/tasks?batchId=$batchId"

# POST request
$body = @{ userId = "user-id"; workflowStage = "ANNOTATION" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3003/api/v1/tasks/$taskId/assign" `
  -Method Post -Body $body -ContentType "application/json"

# Pretty print response
$response | ConvertTo-Json -Depth 10
```

### API Testing (curl/bash)

```bash
# GET request
curl "http://localhost:3003/api/v1/tasks?batchId=$batchId"

# POST request
curl -X POST "http://localhost:3003/api/v1/tasks/$taskId/assign" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-id", "workflowStage": "ANNOTATION"}'
```

### Frontend API Client Generation ⭐ NEW

**MANDATORY** after ANY backend API changes (new endpoints, method renames, DTO changes).

```powershell
# Ensure all backend services are running
cd welo-platform
docker compose ps

# Navigate to frontend and regenerate API clients
cd ../welo-platform-ui
npm run generate:api
```

**What happens:**
- Fetches live OpenAPI/Swagger specs from all backend services
- Generates type-safe API client functions in `src/generated/`
- TypeScript will catch API mismatches at compile time (not runtime!)

**When to run:**
- ✅ After adding/modifying backend endpoints
- ✅ After changing DTOs or validation rules
- ✅ Before implementing frontend changes that use backend APIs

**Usage in Frontend:**
```typescript
// Import generated function
import { getTasksTaskId, updateTasksTaskId } from '../generated/taskApi';

// Use it - auth tokens automatically applied
const task = await getTasksTaskId(taskId);
```

**Config:** `welo-platform-ui/orval.config.ts`

---

## 📝 API Contract Template

```typescript
// POST /api/v1/resource/:id/action

interface RequestDto {
  field1: string;
  field2: number;
  field3?: string; // optional
}

interface ResponseDto {
  success: boolean;
  data: {
    id: string;
    status: string;
  };
}

// Error Cases
// 400: Invalid input (field1 missing)
// 404: Resource not found
// 409: Conflict (already exists)
```

---

## 🚨 Common Pitfalls & Quick Fixes

### Pitfall 1: TypeORM Cascade NULL Constraints

```typescript
// ❌ WRONG
const task = await repo.findOne({ where: { id }, relations: ['assignments'] });
task.assignments.push(newAssignment);
await repo.save(task); // NULL constraint violation!

// ✅ CORRECT
await assignmentRepo.createQueryBuilder().insert().values(assignment).execute();
```

**Rule:** Use `.insert()` for new child entities. Never save parent with loaded children.

---

### Pitfall 2: Response Structure Mismatch

```typescript
// Backend: { tasks: [...], total: 20 }
// Frontend expects: [...]

// ❌ WRONG
const tasks = await api.get('/tasks'); // Crashes

// ✅ CORRECT
const response = await api.get<{ tasks: Task[] }>('/tasks');
return response.tasks;
```

**Rule:** Define exact response structure in contract. Extract nested data explicitly.

---

### Pitfall 3: Missing Computed Fields

```typescript
// Task entity has assignmentId (FK)
// UI needs assignedTo (userId from assignment)

// ✅ Add transformation in backend
async listTasks() {
  const tasks = await repo.find({ relations: ['assignments'] });
  return tasks.map(task => ({
    ...task,
    assignedTo: task.assignments.find(a => a.status === 'ASSIGNED')?.userId || null
  }));
}
```

**Rule:** Return exactly what frontend needs, not just database fields.

---

### Pitfall 4: Enum Case Sensitivity

```typescript
// DTO: workflowStage = "annotation" (lowercase)
// Enum: WorkflowStage.ANNOTATION (uppercase)

// ❌ WRONG
assignment.workflowStage = dto.workflowStage; // Fails

// ✅ CORRECT
assignment.workflowStage = WorkflowStage[dto.workflowStage.toUpperCase()];
```

**Rule:** Always normalize enum values. Use `toUpperCase()` or validation transforms.

---

## ⚡ Quick Wins

### Win 1: Create Test Script (30 min investment)

**File:** `scripts/test-apis.ps1`

```powershell
$batchId = "your-batch-id"
$taskId = "your-task-id"
$userId = "your-user-id"

# Test 1: List tasks
Write-Host "Testing GET /tasks" -ForegroundColor Yellow
Invoke-RestMethod "http://localhost:3003/api/v1/tasks?batchId=$batchId"

# Test 2: Assign task
Write-Host "Testing POST /tasks/:id/assign" -ForegroundColor Yellow
$body = @{ userId = $userId; workflowStage = "ANNOTATION" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3003/api/v1/tasks/$taskId/assign" `
  -Method Post -Body $body -ContentType "application/json"
```

**Usage:** Run before ANY UI work.

**Time Saved:** 30-45 min/feature.

---

### Win 2: Shared Types (1 hour investment)

**File:** `libs/common/src/dto/api.dto.ts`

```typescript
export interface TaskDto {
  id: string;
  status: string;
  assignedTo: string | null;
  workflowStage: string | null;
}

export interface AssignTaskRequest {
  userId: string;
  workflowStage: 'ANNOTATION' | 'REVIEW';
}
```

**Usage:**
- Backend: `import { TaskDto } from '@app/common/dto/api.dto';`
- Frontend: `import { TaskDto } from '@/types/api';` (re-export)

**Benefit:** Zero interface mismatches.

---

### Win 3: Feature Plan Template (15 min investment)

**File:** `docs/FEATURE_PLAN_TEMPLATE.md`

```markdown
# Feature: [Name]

## API Contracts
[Define request/response]

## Implementation Plan
- [ ] Backend (45 min)
- [ ] Backend testing (15 min)
- [ ] Frontend (30 min)
- [ ] Integration test (15 min)

## Testing Commands
[Curl/PowerShell commands]
```

**Usage:** Copy for each feature.

**Time Saved:** 60-70% fewer iterations.

---

## 📊 Time Comparison

### ❌ Old Way (Reactive)
1. Code based on assumptions
2. Integrate frontend + backend
3. Find error
4. Fix → Rebuild
5. Repeat 6+ times

**Total:** 3+ hours, 6+ rebuilds

---

### ✅ New Way (Contract-First)
1. Define contract (15 min)
2. Implement backend (45 min)
3. Test backend with curl (15 min)
4. Fix issues (1-2 rebuilds) (30 min)
5. Implement frontend (30 min)
6. Integration test (15 min)

**Total:** ~2 hours, 1-2 rebuilds

**Savings:** 33-50% faster

---

## 🎓 TypeORM Best Practices

```typescript
// ✅ Insert new child entity
await repo.createQueryBuilder()
  .insert()
  .values(entity)
  .execute();

// ✅ Update parent entity
const parent = await repo.findOne({ where: { id } }); // NO RELATIONS
parent.status = newStatus;
await repo.save(parent);

// ✅ Query with relations for read-only
const data = await repo.find({ relations: ['children'] });

// ❌ NEVER save parent with loaded children
const parent = await repo.findOne({ where: { id }, relations: ['children'] });
parent.children.push(newChild);
await repo.save(parent); // DANGER: NULL constraints!
```

---

## 🔍 Debugging Tips

### Backend Error → Check These First

1. **NULL constraint violation**
   - Check: TypeORM cascade saves
   - Fix: Use query builder insert

2. **Property undefined**
   - Check: Missing joins/relations
   - Fix: Add `.leftJoinAndSelect()`

3. **Enum validation failed**
   - Check: Case sensitivity
   - Fix: Add `.toUpperCase()`

4. **404 Not Found**
   - Check: UUID format
   - Fix: Validate UUID with `class-validator`

### Frontend Error → Check These First

1. **Cannot read property of undefined**
   - Check: Response structure mismatch
   - Fix: Extract nested data explicitly

2. **Type error**
   - Check: Interface doesn't match API
   - Fix: Update TypeScript interface

3. **Network error 500**
   - Check: Backend logs first
   - Fix: Test with curl, fix backend

---

## 🚀 Next Steps

1. ✅ Create `scripts/test-apis.ps1`
2. ✅ Create `docs/FEATURE_PLAN_TEMPLATE.md`
3. ✅ Set up shared types in `libs/common/`
4. ✅ Practice on next feature
5. ✅ Refine workflow based on experience

---

## 💡 Remember

> "15 minutes planning saves 2 hours debugging"

> "Test backend first, frontend second, integration third"

> "One rebuild is better than six"

---

## 📚 Full Guide

See [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) for detailed explanations and examples.
