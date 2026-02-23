# Feature: [Feature Name]

> **Copy this template to `docs/features/your-feature-name.md` before starting any feature work**

---

## Overview

Brief description of what this feature does and why it's needed.

**User Story:** As a [role], I want to [action] so that [benefit].

---

## Requirements

- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

---

## API Contracts

### Endpoint 1: [METHOD] [/api/v1/path]

**Description:** What this endpoint does

**Request:**
```typescript
interface RequestDto {
  field1: string;        // Description, validation rules
  field2: number;        // Description, validation rules
  field3?: string;       // Optional field description
}
```

**Response (Success - 200):**
```typescript
interface ResponseDto {
  success: boolean;
  data: {
    id: string;
    field1: string;
    computedField: string; // Description of computed field
  };
  metadata?: {
    total: number;
    page: number;
  };
}
```

**Error Cases:**
- `400 Bad Request`: Invalid input (field1 missing or invalid format)
- `404 Not Found`: Resource with given ID not found
- `409 Conflict`: Resource already exists or state conflict
- `500 Internal Server Error`: Unexpected server error

**Example Request:**
```json
{
  "field1": "example-value",
  "field2": 123
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "field1": "example-value",
    "computedField": "computed-result"
  }
}
```

---

### Endpoint 2: [METHOD] [/api/v1/path/:id]

**Description:** What this endpoint does

**Request:** None (or define if needed)

**Response (Success - 200):**
```typescript
interface ListResponseDto {
  items: ResourceDto[];
  total: number;
  page: number;
  pageSize: number;
}
```

**Error Cases:**
- `404 Not Found`: Parent resource not found

---

## Database Changes

### New Tables

**Table:** `table_name`

| Column          | Type             | Constraints              | Description                    |
|-----------------|------------------|--------------------------|--------------------------------|
| id              | uuid             | PK, DEFAULT uuid_v4()    | Primary key                    |
| field1          | varchar(255)     | NOT NULL                 | Description                    |
| field2_id       | uuid             | FK → other_table(id)     | Foreign key reference          |
| status          | enum             | NOT NULL, DEFAULT 'X'    | Status enum values             |
| created_at      | timestamp        | DEFAULT NOW()            | Creation timestamp             |
| updated_at      | timestamp        | DEFAULT NOW()            | Last update timestamp          |

**Indexes:**
- `idx_table_field1` on `field1`
- `idx_table_field2_id` on `field2_id`

### Schema Migrations

**Migration File:** `YYYYMMDDHHMMSS_feature_name.ts`

**Changes:**
- Create table `table_name`
- Add column `new_field` to `existing_table`
- Create index `idx_existing_table_new_field`
- Add foreign key constraint

**Migration Commands:**
```bash
# Generate migration
npm run migration:generate -- -n FeatureName

# Run migration
npm run migration:run

# Revert if needed
npm run migration:revert
```

### Entity Changes

**Entity:** `Task` (or new entity name)

**Fields Added:**
```typescript
@Column({ type: 'varchar', length: 255, nullable: true })
newField: string;

@ManyToOne(() => User, (user) => user.tasks)
@JoinColumn({ name: 'user_id' })
user: User;
```

**Relations:**
- `@ManyToOne(() => RelatedEntity)` - Description
- `@OneToMany(() => ChildEntity, (child) => child.parent)` - Description

---

## Implementation Plan

### Phase 1: Backend Implementation
**Estimated Time:** 45-60 minutes

- [ ] Create DTOs in `src/dto/`
  - `create-resource.dto.ts` with validation decorators
  - `update-resource.dto.ts`
  - `resource-response.dto.ts`
- [ ] Create/update TypeORM entity in `src/entities/`
- [ ] Create migration file (if schema changes)
- [ ] Implement service method in `src/service/resource.service.ts`
  - Business logic
  - Error handling
  - Transaction management (if needed)
- [ ] Create controller endpoint in `src/controller/resource.controller.ts`
  - Route definition
  - Swagger documentation
  - DTO validation
- [ ] Add unit tests (optional but recommended)

**Key Considerations:**
- Use `.createQueryBuilder().insert()` for new child entities
- Fetch entities WITHOUT relations before updating
- Normalize enum values (`.toUpperCase()`)
- Handle error cases explicitly

---

### Phase 2: Backend Testing
**Estimated Time:** 15-20 minutes

**Build Service:**
```powershell
docker compose build <service-name>
docker compose up -d <service-name>
```

**Test Commands:**

```powershell
# Configuration
$baseUrl = "http://localhost:PORT/api/v1"
$resourceId = "550e8400-e29b-41d4-a716-446655440000"

# Test 1: Create resource
Write-Host "Testing POST /resource" -ForegroundColor Yellow
$body = @{
  field1 = "test-value"
  field2 = 123
} | ConvertTo-Json

$created = Invoke-RestMethod -Uri "$baseUrl/resource" `
  -Method Post -Body $body -ContentType "application/json"
$created | ConvertTo-Json -Depth 5

# Test 2: Get resource
Write-Host "Testing GET /resource/:id" -ForegroundColor Yellow
$retrieved = Invoke-RestMethod -Uri "$baseUrl/resource/$($created.data.id)"
$retrieved | ConvertTo-Json -Depth 5

# Test 3: List resources
Write-Host "Testing GET /resources" -ForegroundColor Yellow
$list = Invoke-RestMethod -Uri "$baseUrl/resources"
Write-Host "Total: $($list.total)"

# Test 4: Update resource
Write-Host "Testing PATCH /resource/:id" -ForegroundColor Yellow
$updateBody = @{ field1 = "updated-value" } | ConvertTo-Json
$updated = Invoke-RestMethod -Uri "$baseUrl/resource/$resourceId" `
  -Method Patch -Body $updateBody -ContentType "application/json"
$updated | ConvertTo-Json -Depth 5

# Test 5: Error case - Invalid input
Write-Host "Testing error handling" -ForegroundColor Yellow
try {
  $invalidBody = @{ invalidField = "value" } | ConvertTo-Json
  Invoke-RestMethod -Uri "$baseUrl/resource" `
    -Method Post -Body $invalidBody -ContentType "application/json"
} catch {
  Write-Host "Expected error: $($_.Exception.Message)" -ForegroundColor Red
}
```

**Validation Checklist:**
- [ ] Happy path works correctly
- [ ] Response structure matches contract
- [ ] Error cases return appropriate status codes
- [ ] Database state is correct (check with SQL query)
- [ ] Computed fields populated correctly
- [ ] Enum values normalized

---

### Phase 3: Frontend Implementation
**Estimated Time:** 30-45 minutes

**Only proceed after backend is 100% validated**

- [ ] Update TypeScript interfaces in `src/types/` or service file
  ```typescript
  export interface Resource {
    id: string;
    field1: string;
    computedField: string;
  }
  
  export interface CreateResourceRequest {
    field1: string;
    field2: number;
  }
  ```

- [ ] Create/update service method in `src/services/resourceService.ts`
  ```typescript
  export const createResource = async (
    request: CreateResourceRequest
  ): Promise<Resource> => {
    const response = await apiClient.post<{ data: Resource }>(
      '/resource', 
      request
    );
    return response.data;
  };
  ```

- [ ] Update UI components
  - Form inputs with validation
  - Submit handlers
  - Error display
  - Loading states
  - Success feedback

- [ ] Add error handling
  ```typescript
  try {
    setLoading(true);
    const result = await createResource(formData);
    setSuccess('Resource created successfully');
  } catch (error) {
    setError(error.response?.data?.message || 'Failed to create resource');
  } finally {
    setLoading(false);
  }
  ```

---

### Phase 4: Integration Testing
**Estimated Time:** 10-15 minutes

- [ ] End-to-end happy path
  - Fill form in UI
  - Submit
  - Verify success message
  - Check data appears in list
- [ ] Error handling
  - Submit invalid data
  - Verify user-friendly error message
  - Form should not clear on error
- [ ] Edge cases
  - Empty initial state
  - Loading states visible
  - Concurrent operations
- [ ] Browser console
  - No errors in console
  - Network tab shows correct requests/responses
- [ ] Database verification
  - Data persisted correctly
  - Relations created
  - Constraints satisfied

---

## Testing Scripts

Save as `scripts/test-feature-name.ps1`:

```powershell
# Feature Name API Testing Script
# Usage: .\scripts\test-feature-name.ps1

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:PORT/api/v1"

Write-Host "=== Testing [Feature Name] APIs ===" -ForegroundColor Green

# Add all test commands from Phase 2 here

Write-Host "`n=== All Tests Complete ===" -ForegroundColor Green
```

---

## Rollback Plan

If something goes wrong during deployment:

1. **Revert Code Changes:**
   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Rollback Database Migration:**
   ```bash
   npm run migration:revert
   ```

3. **Restart Services:**
   ```bash
   docker compose restart <service-name>
   ```

4. **Verify System State:**
   - Check logs for errors
   - Test critical user paths
   - Verify database integrity

---

## Success Criteria

Feature is considered complete when:

- [ ] All API tests pass (curl/PowerShell)
- [ ] Frontend displays data correctly
- [ ] Error handling shows user-friendly messages
- [ ] No console errors in browser
- [ ] Database constraints satisfied
- [ ] Swagger documentation updated
- [ ] Code follows SOLID principles
- [ ] No TypeORM cascade issues
- [ ] Shared types used (if applicable)
- [ ] Feature plan marked as complete

---

## Notes

Any additional notes, considerations, or follow-up tasks:

- 
- 
- 

---

## Timeline

| Phase                  | Estimated | Actual | Status      |
|------------------------|-----------|--------|-------------|
| Planning               | 15 min    |        | ⏸️ Pending  |
| Backend Implementation | 60 min    |        | ⏸️ Pending  |
| Backend Testing        | 20 min    |        | ⏸️ Pending  |
| Frontend Implementation| 45 min    |        | ⏸️ Pending  |
| Integration Testing    | 15 min    |        | ⏸️ Pending  |
| **Total**              | **155 min**|       |             |

**Status Legend:**
- ⏸️ Pending
- 🔄 In Progress
- ✅ Complete
- ⚠️ Blocked

---

**Last Updated:** [Date]
**Implemented By:** [Name]
**Reviewed By:** [Name]
