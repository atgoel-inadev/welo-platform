# GitHub Copilot – Project Instructions

This repository contains the **Welo Data Annotation Platform**, an internal, end-to-end system for managing
data annotation workflows, queueing, task execution, quality control, and batch-level exports.

Copilot MUST strictly follow the architectural, design, and coding rules defined below.

---

## 1. Project Overview

The Welo Data Annotation Platform is a **configurable, scalable, monorepo-based microservices system**
that centralizes:

- Queueing and task orchestration
- Annotation workflows
- Annotation user interfaces
- Operational tooling
- Quality assurance processes
- Batch-level data export

The platform replaces fragmented tools and manual processes with a unified, configurable environment
that ensures **operational consistency across projects and customers**.

---

## 2. Technology Stack (MANDATORY)

Copilot MUST use the following technologies only:

### Backend
- **NestJS** (mandatory for all services)
- **TypeScript** (preferred) or **modern JavaScript**
- **TypeORM** for persistence
- **PostgreSQL** (assumed default unless specified)

### Workflow & State
- **XState** for:
  - Workflow definitions
  - Task lifecycle management
  - Approval flows
  - Quality review states
  - Batch processing states

### Architecture
- **Monorepo**
- **Microservices**
- **Domain-driven boundaries**
- **Event-driven communication (preferred over direct coupling)**

---

## 3. Monorepo Structure Rules

Copilot MUST follow this logical structure:

/apps
/api-gateway
/workflow-service
/annotation-service
/quality-service
/export-service

/libs
/domain
/workflow-engine
/persistence
/shared
/contracts

Rules:
- Each service is independently deployable
- Shared logic MUST live in `/libs`
- No circular dependencies between apps
- No business logic in controllers

---

## 4. Workflow & State Management Rules (XState)

- All workflows MUST be modeled using **XState**
- No ad-hoc status flags or enums for workflow logic
- Each workflow must:
  - Be data-driven
  - Support configuration per project
  - Persist state transitions
  - Emit audit events

Examples of valid workflows:
- Task lifecycle (Created → Assigned → Annotating → Review → Approved / Rejected)
- Quality control workflows
- Batch export workflows

---

## 5. Persistence Rules (TypeORM)

- Use **TypeORM Entities** only
- No raw SQL unless absolutely required
- Repositories MUST:
  - Encapsulate persistence logic
  - Never contain business logic
- Use migrations for schema changes
- All state transitions must be persisted and auditable

---

## 6. Clean Code Principles (MANDATORY)

Copilot MUST ensure:

- Small, single-purpose functions
- Descriptive naming (no abbreviations)
- No magic numbers or strings
- Explicit error handling
- No deeply nested conditionals
- Prefer composition over inheritance

Code should be readable without comments.

---

## 7. SOLID Principles (MANDATORY)

Copilot MUST enforce:

- **Single Responsibility**: One reason to change
- **Open/Closed**: Extend behavior, don’t modify core logic
- **Liskov Substitution**: Interfaces must be substitutable
- **Interface Segregation**: Small, focused interfaces
- **Dependency Inversion**: Depend on abstractions, not implementations

NestJS Dependency Injection MUST be used consistently.

---

## 8. GoF Design Patterns (USE WHERE APPLICABLE)

Copilot SHOULD prefer established patterns, including but not limited to:

- **Factory** – workflow creation, service instantiation
- **Strategy** – annotation rules, validation logic, scoring
- **State** – XState integration
- **Observer / Pub-Sub** – workflow events, audit logs
- **Command** – task actions (approve, reject, reassign)
- **Adapter** – external tools or legacy integrations
- **Facade** – API gateway orchestration

Patterns must be explicit and intentional.

---

## 9. Service Design Rules

- Controllers:
  - Handle HTTP only
  - No business logic
- Services:
  - Contain domain logic
  - Orchestrate workflows
- Domain Layer:
  - Pure business rules
  - No framework dependencies
- Infrastructure Layer:
  - Database, queues, external services

---

## 10. Quality, Audit & Observability

Copilot MUST:
- Log all workflow transitions
- Persist audit trails
- Emit domain events
- Keep quality decisions traceable
- Ensure batch-level traceability for exports

---

## 11. What Copilot MUST NOT Do

- Do NOT put logic in controllers
- Do NOT bypass XState for workflow logic
- Do NOT tightly couple services
- Do NOT duplicate domain logic across services
- Do NOT violate SOLID or Clean Code principles
- Do NOT introduce unnecessary frameworks

---

## 13. Docker & Service Management Rules (CRITICAL)

### Build and Deployment Strategy
- **NEVER** run `docker compose down` unless absolutely necessary (destroys all containers)
- **ALWAYS** build and restart ONLY the service being modified
- Use targeted commands:
  - Build single service: `docker compose build <service-name>`
  - Restart single service: `docker compose up -d <service-name>`
  - View logs: `docker compose logs -f <service-name>`

### Service-Specific Operations
- When fixing code in auth-service → Only rebuild/restart auth-service
- When fixing code in project-management → Only rebuild/restart project-management
- Infrastructure services (postgres, redis, kafka) should rarely be restarted
- Use `--no-deps` flag when recreating services to avoid restarting dependencies

### Build Optimization
- **DON'T** use `--no-cache` unless debugging build issues
- **DO** rely on Docker layer caching for speed
- BuildKit cache mounts are configured → builds are incremental
- First build: ~2-3 min per service, Incremental: ~10-30 seconds

### Examples
```bash
# ✅ CORRECT: Fix and restart single service
docker compose build auth-service
docker compose up -d auth-service

# ✅ CORRECT: Restart without rebuild (env changes)
docker compose restart auth-service

# ✅ CORRECT: Recreate single service
docker compose up -d --force-recreate --no-deps auth-service

# ❌ WRONG: Destroys everything
docker compose down
docker compose up -d

# ❌ WRONG: Rebuilds everything
docker compose build --no-cache
```

### Reference Documentation
- See `DOCKER_BUILD_GUIDE.md` for detailed scenarios and best practices
- All Dockerfiles use BuildKit cache mounts for npm packages
- Multi-stage builds minimize production image size

---

## 14. Proactive Development Practices (MANDATORY)

Copilot MUST follow contract-first, backend-first, test-first development practices to minimize iteration cycles and prevent integration issues.

### API Contract Definition

Before implementing ANY feature that adds/modifies endpoints:

1. **Define API Contract First** (TypeScript interfaces)
   - Request DTO with validation rules
   - Response DTO with exact structure
   - Error cases (400, 404, 409, 500)
   - Example payloads

2. **Document in Feature Plan**
   - Create `docs/features/feature-name.md`
   - Include API contracts, database changes, testing commands
   - Review before coding

3. **Use Shared Types**
   - Place contracts in `libs/common/src/dto/`
   - Import in both backend and frontend
   - Prevents interface mismatches

### Backend Validation Before UI Integration

**CRITICAL**: Copilot MUST validate backend independently before touching frontend code.

**Required Workflow:**
1. Implement backend endpoint
2. Build service: `docker compose build <service-name>`
3. Start service: `docker compose up -d <service-name>`
4. **Test with curl/PowerShell commands**
5. Fix issues → rebuild → retest
6. **ONLY after backend works**: Implement frontend

**PowerShell Testing Template:**
```powershell
# GET request
Invoke-RestMethod -Uri "http://localhost:PORT/api/v1/endpoint?param=$value"

# POST request
$body = @{ field1 = "value1"; field2 = 123 } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:PORT/api/v1/endpoint" `
  -Method Post -Body $body -ContentType "application/json"
```

**Why This Matters:**
- Backend bugs found in 30 seconds (curl) vs 5 minutes (UI navigation)
- No UI state contamination
- Easy to reproduce and debug
- Fast iteration cycle

### Proactive Checks for Code Changes

When implementing features, Copilot MUST proactively:

1. **For Backend Changes:**
   - [ ] Define request/response DTOs
   - [ ] Add validation decorators (`@IsNotEmpty()`, `@IsUUID()`, etc.)
   - [ ] Add Swagger documentation (`@ApiProperty()`, `@ApiResponse()`)
   - [ ] Handle error cases explicitly
   - [ ] Test with curl BEFORE frontend work
   - [ ] Verify database state if persistence involved

2. **For Frontend Changes:**
   - [ ] Update TypeScript interfaces to match backend contract
   - [ ] Add error handling for all API calls
   - [ ] Add loading states
   - [ ] Handle empty states
   - [ ] Test in browser after backend validation

3. **For Database Changes:**
   - [ ] Create migration file
   - [ ] Update TypeORM entity
   - [ ] Add indexes for foreign keys
   - [ ] Consider cascade behavior (prefer explicit over automatic)
   - [ ] Test migration up and down

### Frontend API Client Generation (CRITICAL)

**MANDATORY**: After ANY backend API changes (new endpoints, renamed methods, changed DTOs), regenerate the frontend API clients to ensure compile-time type safety.

**Workflow:**

1. **Backend Changes Complete**
   - Ensure Swagger/OpenAPI decorators are added (`@ApiProperty()`, `@ApiResponse()`, etc.)
   - Ensure service is running: `docker compose ps <service-name>`
   - Verify Swagger UI accessible: `http://localhost:<port>/api/docs`

2. **Regenerate API Clients**
   ```bash
   cd welo-platform-ui
   npm run generate:api
   ```
   
   **Prerequisites:** All backend services MUST be running (`docker compose up -d`)

3. **Verify Generation**
   - Check `welo-platform-ui/src/generated/` for updated files:
     - `authApi.ts` (port 3002)
     - `workflowApi.ts` (port 3001)
     - `taskApi.ts` (port 3003)
     - `projectApi.ts` (port 3004)
     - `annotationQaApi.ts` (port 3005)
   - TypeScript compilation should catch any breaking changes
   - If backend renamed `fetchProjectById` → `getProject`, TypeScript will error at compile time

4. **Update Frontend Code**
   - Import generated functions directly:
     ```typescript
     import { getTasksTaskId, updateTasksTaskId } from '../generated/taskApi';
     ```
   - Generated calls automatically use auth-aware `ApiClient` instances via `src/lib/mutators.ts`
   - Bearer tokens and 401-redirect interceptors are applied automatically

**When to Regenerate:**
- ✅ After adding new backend endpoints
- ✅ After renaming backend methods
- ✅ After changing request/response DTOs
- ✅ After modifying backend validation rules
- ✅ Before deploying frontend changes that use backend APIs

**Benefits:**
- **Compile-Time Safety**: TypeScript catches API mismatches before runtime
- **Auto-Complete**: IDE provides full IntelliSense for all backend endpoints
- **Single Source of Truth**: Backend Swagger spec drives frontend types
- **Zero Manual Sync**: No manual interface copying between backend/frontend

**Configuration:**
- Orval config: `welo-platform-ui/orval.config.ts`
- Mutators: `welo-platform-ui/src/lib/mutators.ts`
- Generated output: `welo-platform-ui/src/generated/`

### TypeORM Critical Rules

**NEVER** save parent entity with loaded child relations. This causes NULL constraint violations.

**❌ WRONG:**
```typescript
const task = await taskRepo.findOne({ 
  where: { id }, 
  relations: ['assignments'] 
});
task.assignments.push(newAssignment);
await taskRepo.save(task); // DANGER: Cascade update nullifies child.task_id
```

**✅ CORRECT:**
```typescript
// Insert child separately
await assignmentRepo.createQueryBuilder()
  .insert()
  .values(assignment)
  .execute();

// Update parent without relations
const task = await taskRepo.findOne({ where: { id } }); // NO RELATIONS
task.status = TaskStatus.ASSIGNED;
await taskRepo.save(task);
```

**Rules:**
- Use `.createQueryBuilder().insert()` for new child entities
- Fetch parent entities WITHOUT relations when updating parent-only fields
- Use relations only for read operations
- Prefer explicit over cascade operations

### API Response Transformation

When listing entities, always return what the frontend NEEDS, not just database fields.

**Example:**
```typescript
async listTasks(): Promise<Task[]> {
  const tasks = await this.taskRepository.find({
    relations: ['assignments', 'assignments.user']
  });
  
  // Transform to add computed fields
  return tasks.map(task => {
    const activeAssignment = task.assignments?.find(
      a => a.status === AssignmentStatus.ASSIGNED || 
           a.status === AssignmentStatus.IN_PROGRESS
    );
    
    return {
      ...task,
      // Frontend-friendly computed fields
      assignedTo: activeAssignment?.userId || null,
      assignedToName: activeAssignment?.user?.name || null,
      workflowStage: activeAssignment?.workflowStage || null,
      fileName: task.fileMetadata?.fileName || task.externalId
    };
  });
}
```

### Testing Scripts

Copilot SHOULD suggest creating testing scripts for frequently used APIs:

**File:** `scripts/test-{domain}-apis.ps1`

```powershell
# Configuration
$baseUrl = "http://localhost:PORT/api/v1"
$resourceId = "uuid-here"

Write-Host "=== Testing {Domain} APIs ===" -ForegroundColor Green

# Test each endpoint
Write-Host "`n1. GET /resource" -ForegroundColor Yellow
$result = Invoke-RestMethod -Uri "$baseUrl/resource"
$result | ConvertTo-Json -Depth 5

# Include error case testing
Write-Host "`n2. POST /resource (invalid)" -ForegroundColor Yellow
try {
  $body = @{ invalidField = "value" } | ConvertTo-Json
  Invoke-RestMethod -Uri "$baseUrl/resource" -Method Post -Body $body -ContentType "application/json"
} catch {
  Write-Host "Expected error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Tests Complete ===" -ForegroundColor Green
```

### Code Review Checklist

Before proposing any code change, Copilot MUST verify:

**Backend:**
- [ ] DTOs defined with validation decorators
- [ ] Swagger documentation added
- [ ] Error cases handled explicitly
- [ ] TypeORM queries avoid cascade pitfalls
- [ ] Service layer contains business logic (not controller)
- [ ] Repository layer only handles persistence
- [ ] Enums normalized (e.g., `.toUpperCase()`)

**Frontend:**
- [ ] TypeScript interfaces match backend contracts
- [ ] API calls use centralized service methods
- [ ] Error handling with user-friendly messages
- [ ] Loading states for async operations
- [ ] Empty states handled gracefully
- [ ] Type assertions avoided (prefer proper typing)

**Integration:**
- [ ] Backend tested with curl first
- [ ] Database state verified
- [ ] Frontend wired to match backend contract
- [ ] End-to-end flow tested in browser
- [ ] Console errors checked

### Time-Saving Principles

1. **Define Before Implement** (15 min planning saves 2 hours debugging)
2. **Test Backend First** (30 sec curl vs 5 min UI navigation)
3. **Build Once** (One rebuild vs six rebuilds)
4. **Shared Types** (Zero interface mismatches)
5. **Feature Plans** (60-70% fewer iterations)

### Reference Documentation

See project workflow guides:
- `DEVELOPMENT_WORKFLOW.md` - Detailed workflow guide with examples
- `WORKFLOW_CHEAT_SHEET.md` - Quick reference for common tasks
- `DOCKER_BUILD_GUIDE.md` - Docker-specific best practices

---

## 15. Default Assumptions

Unless explicitly stated otherwise:
- API style is REST
- Authentication is handled at gateway level
- Services communicate via events
- Configuration is data-driven
- Scalability and auditability are first-class concerns

---

## 16. Final Instruction

Copilot should behave as a **Senior Backend Architect** and generate **production-grade, maintainable, extensible code**
aligned with enterprise workflow platforms.

Shortcuts, hacks, or demo-style implementations are NOT acceptable.
