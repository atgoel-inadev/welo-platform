# Project Management Implementation Summary

## Overview
Implemented a comprehensive Project Management service with support for:
- **Annotation questions** (multi-select, text, single-select, number, date)
- **Multi-annotator assignments** (multiple annotators per task)
- **Git-like review process** (multi-level reviews with approval requirements)
- **File type support** (CSV, TXT, IMAGE, VIDEO, AUDIO, PDF)
- **XState workflow integration** (automated workflow generation)

## What Was Implemented

### 1. Entity Enhancements

#### Project Entity (`project.entity.ts`)
- **Added** `annotationQuestions` array to configuration:
  - Question ID, text, type (MULTI_SELECT, TEXT, SINGLE_SELECT, NUMBER, DATE)
  - Required flag
  - Options for select-type questions
  - Validation rules (min/max length, patterns, ranges)
  - Dependencies (questions that depend on other questions)
  - Conditional display rules

- **Added** `workflowConfiguration` to configuration:
  - `annotatorsPerTask`: Number of annotators per task
  - `reviewLevels`: Array of review levels with:
    - Level number and name
    - Reviewers count
    - Approval requirements (all or threshold)
    - Auto-assign flag
    - Allowed reviewers list
  - `approvalCriteria`: Consensus and quality requirements
  - `assignmentRules`: Self-assignment, duplicates, timeouts

- **Added** `supportedFileTypes`: Array of supported file types

#### Task Entity (`task.entity.ts`)
- **Added** file-related columns:
  - `fileType`: Type of file (CSV, TXT, IMAGE, VIDEO, etc.)
  - `fileUrl`: URL to the file to be annotated
  - `fileMetadata`: JSONB with file details (size, dimensions, duration)

- **Added** consensus tracking:
  - `requiresConsensus`: Boolean flag
  - `consensusReached`: Boolean flag
  - `consensusScore`: Percentage of agreement (0-100)

- **Added** review tracking:
  - `currentReviewLevel`: Current review level (0 = annotation)
  - `maxReviewLevel`: Total review levels configured
  - `allReviewsApproved`: Boolean flag

- **Added** assignment tracking:
  - `totalAssignmentsRequired`: How many annotators needed
  - `completedAssignments`: How many have completed

- **Added** relations:
  - `reviewApprovals`: One-to-many with ReviewApproval
  - `responses`: One-to-many with AnnotationResponse

#### Assignment Entity (`assignment.entity.ts`)
- **Added** multi-assignment support:
  - `assignmentOrder`: Order of this assignment (1st, 2nd, 3rd annotator)
  - `isPrimary`: Is this the primary annotator for consensus
  - `requiresConsensus`: Does this require consensus with others
  - `consensusGroupId`: UUID for grouping assignments that need consensus

#### Annotation Entity (`annotation.entity.ts`)
- **Added** relation:
  - `responses`: One-to-many with AnnotationResponse

### 2. New Entities

#### ReviewApproval Entity (`review-approval.entity.ts`)
Implements git-like review tracking:
- **Fields**:
  - `taskId`: Task being reviewed
  - `assignmentId`: Assignment being reviewed
  - `reviewerId`: User performing review
  - `reviewLevel`: Level number (1, 2, 3, etc.)
  - `status`: PENDING, APPROVED, REJECTED, CHANGES_REQUESTED
  - `comments`: Text feedback
  - `feedback`: JSONB with structured feedback (issues, suggestions, score)
  - `reviewedAt`: Timestamp of review
  - `requestedChanges`: Array of change requests

- **Indexes**: task_id, reviewer_id, assignment_id, review_level, status
- **Composite index**: (task_id, review_level, status) for efficient queries

#### AnnotationResponse Entity (`annotation-response.entity.ts`)
Stores responses to annotation questions:
- **Fields**:
  - `taskId`: Task this response belongs to
  - `annotationId`: Annotation this response is part of
  - `assignmentId`: Assignment this response came from
  - `questionId`: ID of the question being answered
  - `questionText`: Text of the question (denormalized)
  - `questionType`: Type of question
  - `response`: JSONB with the actual response (value, selectedOptions, etc.)
  - `timeSpent`: Seconds spent on this question
  - `confidenceScore`: 0-100 confidence
  - `isSkipped`: Boolean flag
  - `skipReason`: Why it was skipped

- **Indexes**: task_id, annotation_id, assignment_id, question_id

### 3. Project Management Service

#### Structure
```
apps/project-management/
├── src/
│   ├── controllers/
│   │   └── project.controller.ts      # REST API endpoints
│   ├── services/
│   │   ├── project.service.ts         # Project CRUD
│   │   ├── annotation-question.service.ts  # Question management
│   │   └── workflow-config.service.ts # Workflow configuration
│   ├── dto/
│   │   └── index.ts                   # Data transfer objects
│   ├── main.ts                        # Application entry point
│   └── project-management.module.ts   # Module configuration
└── README.md
```

#### API Endpoints

**Project Management**:
- `GET /api/v1/projects` - List projects with filtering
- `GET /api/v1/projects/:id` - Get project details with statistics
- `POST /api/v1/projects` - Create new project
- `PATCH /api/v1/projects/:id` - Update project
- `DELETE /api/v1/projects/:id` - Delete project (soft delete)
- `GET /api/v1/projects/:id/statistics` - Get project statistics

**Annotation Questions**:
- `POST /api/v1/projects/:id/annotation-questions` - Add questions
- `GET /api/v1/projects/:id/annotation-questions` - Get questions
- `PATCH /api/v1/projects/:id/annotation-questions/:questionId` - Update question
- `DELETE /api/v1/projects/:id/annotation-questions/:questionId` - Delete question

**Workflow Configuration**:
- `POST /api/v1/projects/:id/workflow-configuration` - Configure workflow
- `GET /api/v1/projects/:id/workflow-configuration` - Get configuration
- `PATCH /api/v1/projects/:id/workflow-configuration/annotators-per-task` - Update annotator count
- `POST /api/v1/projects/:id/workflow-configuration/review-levels` - Add review level
- `DELETE /api/v1/projects/:id/workflow-configuration/review-levels/:level` - Remove level

**File Types**:
- `POST /api/v1/projects/:id/supported-file-types` - Set file types
- `GET /api/v1/projects/:id/supported-file-types` - Get file types

#### Services

**ProjectService**:
- List projects with pagination
- Get project with statistics
- Create/update/delete projects
- Calculate project statistics (completion rate, quality scores)
- Manage supported file types

**AnnotationQuestionService**:
- Add questions to projects
- Validate question structure and types
- Update/delete questions
- Check dependencies between questions
- Prevent deletion if other questions depend on it

**WorkflowConfigService**:
- Configure workflow settings (annotators, reviews, approvals)
- Validate workflow configuration
- Add/remove review levels
- **Automatically generate XState workflows** based on configuration
- Create/update workflow in database
- Link workflow to project as default workflow

### 4. XState Workflow Generation

The `WorkflowConfigService` automatically creates XState workflow definitions:

**Generated States**:
1. `queued` - Task is created
2. `annotation` - Annotators working on task
3. `checkConsensus` - System checks if consensus reached
4. `needsMoreAnnotations` - More annotators needed
5. `review_level_N` - One state per configured review level (dynamic)
6. `changesRequested` - Changes requested by reviewer
7. `completed` - All reviews approved, task complete

**State Transitions**:
- `ASSIGN` - Assign task to annotator(s)
- `SUBMIT` - Submit annotation
- `APPROVE` - Approve at review level
- `REJECT` - Reject and send back to annotation
- `REQUEST_CHANGES` - Request changes from annotator
- `RESUBMIT` - Resubmit after changes

**Guards**:
- `hasReviewLevels` - Check if project has review levels
- `consensusReached` - Check if consensus met
- `allReviewersApproved` - Check if all reviewers at level approved
- `hasMoreReviewLevels` - Check if more levels exist

### 5. Database Schema Updates

**Modified** `docker/postgres/init/01-schema.sql`:
- Added columns to `tasks` table (11 new columns)
- Added columns to `assignments` table (4 new columns)
- Created `review_approvals` table
- Created `annotation_responses` table
- Added indexes for performance
- Added triggers for updated_at timestamps

### 6. Docker Configuration

**Added** `project-management` service to `docker-compose.yml`:
- Port: 3004
- Environment variables for PostgreSQL, Redis, Kafka
- Health checks
- Volume mounts for hot reload
- Kafka integration

**Created** `docker/project-management/Dockerfile`:
- Multi-stage build (builder + production)
- Node 20 Alpine base image
- Non-root user for security
- Health check endpoint
- Port 3004 exposed

### 7. Documentation

**Created** `apps/project-management/README.md`:
- Complete API documentation
- Usage examples for all endpoints
- Database schema explanations
- Workflow integration guide
- Environment variables
- Testing instructions

**Created** `XSTATE_WORKFLOWS.md`:
- Complete XState workflow definitions
- Multi-annotator workflow example
- Simple review workflow example
- Usage in NestJS services
- State transition documentation
- Guards and actions explained

### 8. Package Updates

**Modified** `package.json`:
- Added `start:project-management` script
- Added to workspaces array

## How It Works

### Creating a Project with Questions and Workflow

1. **Ops Manager creates project**:
```http
POST /api/v1/projects
{
  "name": "Sentiment Analysis",
  "projectType": "TEXT",
  "supportedFileTypes": ["TXT", "CSV"]
}
```

2. **Add annotation questions**:
```http
POST /api/v1/projects/{id}/annotation-questions
{
  "questions": [
    {
      "id": "q1",
      "question": "Sentiment?",
      "questionType": "SINGLE_SELECT",
      "required": true,
      "options": [
        {"id": "1", "label": "Positive", "value": "positive"},
        {"id": "2", "label": "Negative", "value": "negative"}
      ]
    }
  ]
}
```

3. **Configure workflow**:
```http
POST /api/v1/projects/{id}/workflow-configuration
{
  "annotatorsPerTask": 3,
  "reviewLevels": [
    {
      "level": 1,
      "name": "Initial Review",
      "reviewersCount": 2,
      "requireAllApprovals": true
    },
    {
      "level": 2,
      "name": "Final Approval",
      "reviewersCount": 1,
      "requireAllApprovals": true
    }
  ]
}
```

**System automatically**:
- Creates XState workflow definition
- Saves workflow to `workflows` table
- Links workflow to project as default
- Configures 7 states: queued → annotation → checkConsensus → review_level_1 → review_level_2 → completed

### Task Execution Flow

1. **Task created**: State = `queued`
2. **3 annotators assigned**: State = `annotation`, `totalAssignmentsRequired` = 3
3. **Annotators submit**: Each submission increments `completedAssignments`
4. **All submit**: State = `checkConsensus`
5. **Consensus calculated**: If reached, state = `review_level_1`
6. **2 reviewers assigned**: `ReviewApproval` records created with `reviewLevel` = 1
7. **Both approve**: State = `review_level_2`
8. **1 reviewer assigned**: `ReviewApproval` record created with `reviewLevel` = 2
9. **Reviewer approves**: State = `completed`, `allReviewsApproved` = true

### Git-Like Review Process

**Reviewer Actions**:
- **APPROVE**: Move to next level or complete
- **REJECT**: Send back to annotation state
- **REQUEST_CHANGES**: Send back with specific change requests

**Change Request Example**:
```json
{
  "requestedChanges": [
    {
      "field": "q1",
      "currentValue": "positive",
      "suggestedValue": "negative",
      "reason": "Text clearly expresses negative sentiment"
    }
  ]
}
```

## Database Relationships

```
Project
  ├── annotationQuestions (JSONB array)
  ├── workflowConfiguration (JSONB object)
  ├── supportedFileTypes (JSONB array)
  └── defaultWorkflow → Workflow

Task
  ├── fileType, fileUrl, fileMetadata
  ├── consensus tracking fields
  ├── review tracking fields
  ├── assignments → Assignment[] (one-to-many)
  ├── reviewApprovals → ReviewApproval[] (one-to-many)
  └── responses → AnnotationResponse[] (one-to-many)

Assignment
  ├── assignmentOrder, isPrimary
  ├── requiresConsensus, consensusGroupId
  ├── task → Task
  ├── user → User
  └── annotations → Annotation[]

Annotation
  └── responses → AnnotationResponse[]

ReviewApproval
  ├── task → Task
  ├── assignment → Assignment
  ├── reviewer → User
  ├── reviewLevel, status
  └── feedback, requestedChanges

AnnotationResponse
  ├── task → Task
  ├── annotation → Annotation
  ├── assignment → Assignment
  ├── questionId, questionText, questionType
  └── response (JSONB)
```

## Key Validations

1. **Question Validation**:
   - Question ID, text, and type are required
   - Multi-select/single-select must have options
   - Options must have id, label, and value
   - Cannot delete question if others depend on it

2. **Workflow Validation**:
   - annotatorsPerTask must be >= 1
   - Each review level must have level, name, reviewersCount
   - reviewersCount must be >= 1
   - approvalThreshold must be 0-100

3. **Review Level Dependencies**:
   - Levels are auto-sorted by level number
   - Cannot skip levels (1, 2, 3... not 1, 3)
   - XState workflow is regenerated on any change

## Next Steps (Future Enhancements)

1. **Implement Kafka producers** in services to publish events
2. **Implement Kafka consumers** to react to events
3. **Add real-time notifications** when reviews are completed
4. **Implement consensus algorithms** (inter-annotator agreement)
5. **Add benchmarking system** for quality control
6. **Implement task assignment logic** based on skills and workload
7. **Add analytics dashboard** for project progress
8. **Implement batch operations** for bulk task creation

## Testing the Implementation

### Start Services
```bash
# Start infrastructure
docker-compose up -d postgres redis kafka

# Start services (in separate terminals)
npm run start:project-management
npm run start:workflow-engine
npm run start:task-management
npm run start:auth-service
```

### Test API
```bash
# Create project
curl -X POST http://localhost:3004/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "projectType": "TEXT", ...}'

# Add questions
curl -X POST http://localhost:3004/api/v1/projects/{id}/annotation-questions \
  -H "Content-Type: application/json" \
  -d '{"questions": [...]}'

# Configure workflow
curl -X POST http://localhost:3004/api/v1/projects/{id}/workflow-configuration \
  -H "Content-Type: application/json" \
  -d '{"annotatorsPerTask": 3, ...}'
```

## Conclusion

Successfully implemented a complete Project Management service with:
✅ Annotation questions (5 types supported)
✅ Multi-annotator assignments (configurable count)
✅ Git-like multi-level reviews (unlimited levels)
✅ File type support (6 types)
✅ Automatic XState workflow generation
✅ Complete REST API
✅ Database schema
✅ Docker deployment
✅ Comprehensive documentation

The system now supports the full Ops Manager workflow for setting up projects with custom questions, configuring how many annotators work on each task, and defining a multi-level review process similar to git pull requests.
