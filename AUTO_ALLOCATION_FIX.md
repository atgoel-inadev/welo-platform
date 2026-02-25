# Auto-Allocation Fix - February 24, 2026

## Problem Summary

Auto-allocation was assigning tasks to **ALL active annotators/reviewers in the system** instead of only users allocated to the specific project. This caused:

1. Tasks assigned to users not part of the project team
2. "Unknown User" displayed in the UI batch list when tasks were assigned to non-team members
3. Round-robin allocation happening across all users, not project-specific team members

## Root Causes

### Backend (batch.service.ts)

**Issue 1: getEligibleUsers() ignoring project team membership**

```typescript
// ❌ BEFORE: Returns ALL active annotators/reviewers
private async getEligibleUsers(projectId: string): Promise<User[]> {
  return this.userRepository.find({
    where: {
      role: In(['ANNOTATOR', 'REVIEWER']),
      status: UserStatus.ACTIVE,
    },
  });
}
```

**Issue 2: No workflow stage consideration**

- Method didn't differentiate between ANNOTATION stage (needs annotators) vs REVIEW stage (needs reviewers)
- Always queried for both roles regardless of task workflow stage

### Frontend (BatchDetails.tsx)

**Issue: Loading all annotators instead of project team**

```typescript
// ❌ BEFORE: Loads ALL active annotators
const loadAvailableAnnotators = async () => {
  try {
    const annotators = await userService.getAvailableAnnotators();
    setAvailableAnnotators(annotators);
  } catch (err: any) {
    console.error('Failed to load annotators:', err);
  }
};
```

## Solution

### Backend Changes

**File**: `apps/project-management/src/services/batch.service.ts`

1. **Added ProjectTeamMember repository injection**
   ```typescript
   @InjectRepository(ProjectTeamMember)
   private teamMemberRepository: Repository<ProjectTeamMember>,
   ```

2. **Updated getEligibleUsers() to filter by project team**
   ```typescript
   private async getEligibleUsers(projectId: string, workflowStage: WorkflowStage): Promise<User[]> {
     // Determine required role based on workflow stage
     const requiredRole = workflowStage === WorkflowStage.REVIEW ? 'REVIEWER' : 'ANNOTATOR';

     // Query project team members with the appropriate role
     const teamMembers = await this.teamMemberRepository.find({
       where: {
         projectId,
         role: requiredRole,
         isActive: true,
       },
       relations: ['user'],
     });

     // Filter to only active users
     const eligibleUsers = teamMembers
       .filter(member => member.user && member.user.status === UserStatus.ACTIVE)
       .map(member => member.user);

     return eligibleUsers;
   }
   ```

3. **Updated selectUserForAssignment() to determine workflow stage**
   ```typescript
   private async selectUserForAssignment(task: Task, method: string): Promise<string | null> {
     // Determine workflow stage based on task status
     const workflowStage = task.status === TaskStatus.IN_REVIEW 
       ? WorkflowStage.REVIEW 
       : WorkflowStage.ANNOTATION;

     // Get eligible users (project team members with appropriate role)
     const eligibleUsers = await this.getEligibleUsers(project.id, workflowStage);
     // ... rest of logic
   }
   ```

### Frontend Changes

**File**: `welo-platform-ui/src/pages/ops/BatchDetails.tsx`

1. **Import projectService**
   ```typescript
   import { projectService } from '../../services/projectService';
   ```

2. **Updated loadAvailableAnnotators() to load project team**
   ```typescript
   const loadAvailableAnnotators = async () => {
     if (!batch?.projectId) return;
     
     try {
       // Load project team members (both annotators and reviewers)
       const teamMembers = await projectService.getProjectTeam(batch.projectId);
       
       // Extract users from team members
       const users = teamMembers
         .filter(member => 
           (member.role === 'ANNOTATOR' || member.role === 'REVIEWER') && 
           member.user
         )
         .map(member => member.user);
       
       setAvailableAnnotators(users);
     } catch (err: any) {
       console.error('Failed to load project team members:', err);
     }
   };
   ```

3. **Updated useEffect to load team after batch data**
   ```typescript
   useEffect(() => {
     if (id) {
       loadBatchData();
     }
   }, [id]);

   // Load team members after batch data is loaded (need projectId)
   useEffect(() => {
     if (batch) {
       loadAvailableAnnotators();
     }
   }, [batch]);
   ```

## Verification

### Build Status

✅ Backend: `webpack 5.97.1 compiled successfully`
✅ Frontend: `built in 47.86s`

### Expected Behavior After Fix

1. **Auto-Allocation (Round-Robin)**:
   - Only allocates to users in `project_team_members` table for the project
   - Filters by role:
     - ANNOTATION stage → only ANNOTATOR team members
     - REVIEW stage → only REVIEWER team members
   - Only considers active team members (`isActive = true`)
   - Only considers active users (`status = ACTIVE`)

2. **UI Batch List**:
   - Dropdown shows only project team members
   - No "Unknown User" display (all assigned users are in the team)
   - Proper user names displayed in assigned task cards

3. **Round-Robin Distribution**:
   - Distributes among project-specific annotators/reviewers
   - Correctly counts assignments per user
   - Selects user with minimum active assignments

## Testing Recommendations

### Test Scenario 1: Basic Auto-Allocation

```powershell
# 1. Get project with team members
$projectId = "YOUR_PROJECT_ID"
$team = Invoke-RestMethod -Uri "http://localhost:3004/api/v1/projects/$projectId/team"
# Note the annotator user IDs

# 2. Create batch with tasks
$batchId = "YOUR_BATCH_ID"

# 3. Auto-assign tasks
$result = Invoke-RestMethod -Uri "http://localhost:3004/api/v1/batches/$batchId/auto-assign" `
  -Method Post -ContentType "application/json" `
  -Body '{"assignmentMethod":"AUTO_ROUND_ROBIN"}'

# 4. Verify tasks assigned only to project team annotators
$tasks = Invoke-RestMethod -Uri "http://localhost:3003/api/v1/tasks?batchId=$batchId&page=1&pageSize=20"
# Check that all assignedTo values are in the team member list
```

### Test Scenario 2: UI Display

1. Navigate to batch details page in UI
2. Verify user dropdown shows only project team members
3. Auto-assign tasks
4. Verify all assigned tasks show actual user names (no "Unknown User")

### Test Scenario 3: Workflow Stage Filtering

Test with review stage tasks to ensure reviewers (not annotators) are assigned.

## Database Schema Reference

### ProjectTeamMember Table
```sql
CREATE TABLE project_team_members (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL, -- ANNOTATOR, REVIEWER
  is_active BOOLEAN DEFAULT true,
  quota INT,
  assigned_tasks_count INT DEFAULT 0,
  completed_tasks_count INT DEFAULT 0,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)
);
```

## Files Modified

- `apps/project-management/src/services/batch.service.ts`
- `welo-platform-ui/src/pages/ops/BatchDetails.tsx`

## Related Issues

- Round-robin not working properly: Fixed by filtering to project team
- Unknown user display: Fixed by loading project team in UI
- Assignments to unallocated users: Fixed by querying ProjectTeamMember table
