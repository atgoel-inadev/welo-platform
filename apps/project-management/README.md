# Project Management Service

## Overview
The Project Management Service is responsible for managing annotation projects, including:
- Project configuration with annotation questions
- Multi-annotator assignment setup
- Git-like multi-level review workflow configuration
- File type support (CSV, TXT, IMAGE, VIDEO, AUDIO, PDF)
- Workflow orchestration through XState integration

## Key Features

### 1. Annotation Questions Setup
Ops Managers can define questions that annotators must answer for each task/file:

```json
{
  "annotationQuestions": [
    {
      "id": "q1",
      "question": "What is the sentiment of this text?",
      "questionType": "SINGLE_SELECT",
      "required": true,
      "options": [
        { "id": "opt1", "label": "Positive", "value": "positive" },
        { "id": "opt2", "label": "Negative", "value": "negative" },
        { "id": "opt3", "label": "Neutral", "value": "neutral" }
      ]
    },
    {
      "id": "q2",
      "question": "Provide additional context",
      "questionType": "TEXT",
      "required": false,
      "validation": {
        "minLength": 10,
        "maxLength": 500
      }
    },
    {
      "id": "q3",
      "question": "Confidence level",
      "questionType": "NUMBER",
      "required": true,
      "validation": {
        "min": 0,
        "max": 100
      }
    }
  ]
}
```

### 2. Multi-Annotator Configuration
Configure how many annotators should work on each task:

```json
{
  "workflowConfiguration": {
    "annotatorsPerTask": 3,
    "approvalCriteria": {
      "requireAllAnnotatorConsensus": true,
      "consensusThreshold": 80,
      "qualityScoreMinimum": 85
    },
    "assignmentRules": {
      "allowSelfAssignment": false,
      "preventDuplicateAssignments": true,
      "maxConcurrentAssignments": 5,
      "assignmentTimeout": 480
    }
  }
}
```

### 3. Git-Like Review Process
Configure multiple review levels with approval requirements:

```json
{
  "reviewLevels": [
    {
      "level": 1,
      "name": "Initial Review",
      "reviewersCount": 2,
      "requireAllApprovals": true,
      "autoAssign": true,
      "allowedReviewers": ["reviewer-1-uuid", "reviewer-2-uuid"]
    },
    {
      "level": 2,
      "name": "Senior Review",
      "reviewersCount": 1,
      "requireAllApprovals": true,
      "approvalThreshold": 100,
      "autoAssign": false,
      "allowedReviewers": ["senior-reviewer-uuid"]
    },
    {
      "level": 3,
      "name": "Final Approval",
      "reviewersCount": 1,
      "requireAllApprovals": true,
      "autoAssign": true,
      "allowedReviewers": ["ops-manager-uuid"]
    }
  ]
}
```

## API Endpoints

### Project Management

#### Create Project
```http
POST /api/v1/projects
Content-Type: application/json

{
  "name": "Sentiment Analysis Project",
  "customerId": "customer-uuid",
  "description": "Analyze customer feedback sentiment",
  "projectType": "TEXT",
  "createdBy": "user-uuid",
  "supportedFileTypes": ["TXT", "CSV"],
  "annotationSchema": {},
  "qualityThresholds": {
    "minimumScore": 85
  }
}
```

#### Get Project
```http
GET /api/v1/projects/{projectId}
```

#### Update Project
```http
PATCH /api/v1/projects/{projectId}
Content-Type: application/json

{
  "status": "ACTIVE",
  "endDate": "2026-12-31"
}
```

### Annotation Questions

#### Add Questions to Project
```http
POST /api/v1/projects/{projectId}/annotation-questions
Content-Type: application/json

{
  "questions": [
    {
      "id": "q1",
      "question": "What is the main topic?",
      "questionType": "MULTI_SELECT",
      "required": true,
      "options": [
        { "id": "1", "label": "Sports", "value": "sports" },
        { "id": "2", "label": "Politics", "value": "politics" },
        { "id": "3", "label": "Technology", "value": "technology" }
      ]
    }
  ]
}
```

#### Get Project Questions
```http
GET /api/v1/projects/{projectId}/annotation-questions
```

#### Update Question
```http
PATCH /api/v1/projects/{projectId}/annotation-questions/{questionId}
Content-Type: application/json

{
  "required": false,
  "validation": {
    "minLength": 5
  }
}
```

#### Delete Question
```http
DELETE /api/v1/projects/{projectId}/annotation-questions/{questionId}
```

### Workflow Configuration

#### Configure Workflow
```http
POST /api/v1/projects/{projectId}/workflow-configuration
Content-Type: application/json

{
  "annotatorsPerTask": 3,
  "reviewLevels": [
    {
      "level": 1,
      "name": "L1 Review",
      "reviewersCount": 2,
      "requireAllApprovals": true,
      "autoAssign": true
    }
  ],
  "approvalCriteria": {
    "requireAllAnnotatorConsensus": true,
    "consensusThreshold": 80
  },
  "assignmentRules": {
    "allowSelfAssignment": false,
    "preventDuplicateAssignments": true,
    "maxConcurrentAssignments": 5,
    "assignmentTimeout": 480
  }
}
```

#### Get Workflow Configuration
```http
GET /api/v1/projects/{projectId}/workflow-configuration
```

#### Update Annotators Per Task
```http
PATCH /api/v1/projects/{projectId}/workflow-configuration/annotators-per-task
Content-Type: application/json

{
  "count": 5
}
```

#### Add Review Level
```http
POST /api/v1/projects/{projectId}/workflow-configuration/review-levels
Content-Type: application/json

{
  "level": 2,
  "name": "Senior Review",
  "reviewersCount": 1,
  "requireAllApprovals": true,
  "autoAssign": false,
  "allowedReviewers": ["senior-reviewer-uuid"]
}
```

#### Remove Review Level
```http
DELETE /api/v1/projects/{projectId}/workflow-configuration/review-levels/{level}
```

### File Types

#### Set Supported File Types
```http
POST /api/v1/projects/{projectId}/supported-file-types
Content-Type: application/json

{
  "fileTypes": ["CSV", "TXT", "IMAGE", "VIDEO"]
}
```

#### Get Supported File Types
```http
GET /api/v1/projects/{projectId}/supported-file-types
```

### Project Statistics

#### Get Project Statistics
```http
GET /api/v1/projects/{projectId}/statistics
```

Response:
```json
{
  "success": true,
  "data": {
    "totalTasks": 5000,
    "completedTasks": 3200,
    "inProgressTasks": 800,
    "queuedTasks": 1000,
    "completionRate": 64.0,
    "averageQualityScore": 92.5
  }
}
```

## Database Schema

### Enhanced Task Table
```sql
-- Additional columns in tasks table
file_type VARCHAR(50)              -- CSV, TXT, IMAGE, VIDEO, etc.
file_url TEXT                      -- URL to the file
file_metadata JSONB                -- File details (size, dimensions, etc.)
requires_consensus BOOLEAN         -- Does this task require consensus?
consensus_reached BOOLEAN          -- Has consensus been reached?
consensus_score NUMERIC(5,2)       -- Percentage of agreement
current_review_level INTEGER       -- Current review level (0 = annotation)
max_review_level INTEGER           -- Total review levels
all_reviews_approved BOOLEAN       -- All reviews approved?
total_assignments_required INTEGER -- How many annotators needed
completed_assignments INTEGER      -- How many completed
```

### Enhanced Assignment Table
```sql
-- Additional columns in assignments table
assignment_order INTEGER           -- Order of this assignment (1st, 2nd, etc.)
is_primary BOOLEAN                 -- Is this the primary annotator?
requires_consensus BOOLEAN         -- Part of consensus group?
consensus_group_id UUID            -- Group ID for consensus
```

### Review Approvals Table
```sql
CREATE TABLE review_approvals (
    id UUID PRIMARY KEY,
    task_id UUID REFERENCES tasks(id),
    assignment_id UUID REFERENCES assignments(id),
    reviewer_id UUID REFERENCES users(id),
    review_level INTEGER,
    status VARCHAR(50),            -- PENDING, APPROVED, REJECTED, CHANGES_REQUESTED
    comments TEXT,
    feedback JSONB,
    reviewed_at TIMESTAMP,
    requested_changes JSONB
);
```

### Annotation Responses Table
```sql
CREATE TABLE annotation_responses (
    id UUID PRIMARY KEY,
    task_id UUID REFERENCES tasks(id),
    annotation_id UUID REFERENCES annotations(id),
    assignment_id UUID REFERENCES assignments(id),
    question_id VARCHAR(255),
    question_text TEXT,
    question_type VARCHAR(50),
    response JSONB,
    time_spent INTEGER,
    confidence_score NUMERIC(5,2),
    is_skipped BOOLEAN,
    skip_reason TEXT
);
```

## Workflow Integration

The service automatically creates XState workflows when review levels are configured:

1. **Queued State**: Task is created and queued
2. **Annotation State**: Multiple annotators work on the task
3. **Consensus Check**: System checks if annotators agree
4. **Review Level N**: Each configured review level becomes a state
5. **Completed State**: All reviews approved

Example workflow states for 2 review levels:
- `queued` → `annotation` → `checkConsensus` → `reviewLevel1` → `reviewLevel2` → `completed`

## Environment Variables

```env
NODE_ENV=development
PORT=3004
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=welo_platform
REDIS_HOST=localhost
REDIS_PORT=6379
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=project-management
KAFKA_GROUP_ID=project-management-group
```

## Running the Service

### Development
```bash
npm run start:project-management
```

### Production (Docker)
```bash
docker-compose up project-management
```

## Events Published

The service publishes these Kafka events:

- `project.created` - New project created
- `project.updated` - Project configuration changed
- `project.workflow_configured` - Workflow configuration updated
- `project.questions_added` - Annotation questions added
- `project.status_changed` - Project status changed

## Events Consumed

The service consumes:

- `task.completed` - Update project statistics
- `batch.completed` - Update project progress

## Testing

### Create a Project with Questions
```bash
curl -X POST http://localhost:3004/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "customerId": "customer-uuid",
    "projectType": "TEXT",
    "createdBy": "user-uuid",
    "supportedFileTypes": ["TXT", "CSV"]
  }'
```

### Add Annotation Questions
```bash
curl -X POST http://localhost:3004/api/v1/projects/{projectId}/annotation-questions \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

### Configure Multi-Level Review
```bash
curl -X POST http://localhost:3004/api/v1/projects/{projectId}/workflow-configuration \
  -H "Content-Type: application/json" \
  -d '{
    "annotatorsPerTask": 3,
    "reviewLevels": [
      {
        "level": 1,
        "name": "Initial Review",
        "reviewersCount": 2,
        "requireAllApprovals": true,
        "autoAssign": true
      },
      {
        "level": 2,
        "name": "Final Approval",
        "reviewersCount": 1,
        "requireAllApprovals": true,
        "autoAssign": true
      }
    ],
    "approvalCriteria": {
      "requireAllAnnotatorConsensus": true,
      "consensusThreshold": 80
    }
  }'
```

## Architecture

The Project Management Service follows these principles:

1. **Domain-Driven Design**: Clear separation of concerns
2. **Event-Driven**: Publishes events for other services
3. **XState Integration**: Automatically generates workflows
4. **Flexible Configuration**: Supports various project types
5. **Validation**: Comprehensive validation of questions and configurations
6. **Scalability**: Stateless design for horizontal scaling

## Related Services

- **Workflow Engine**: Executes the XState workflows
- **Task Management**: Creates tasks based on project configuration
- **Auth Service**: Manages user roles and permissions
- **Annotation Service**: Handles annotation submissions
