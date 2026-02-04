# Quick Start Guide - Project Management with Multi-Annotator and Review Process

## Overview
This guide walks you through setting up a project with annotation questions, multiple annotators, and a git-like review process.

## Prerequisites
- Docker Desktop running
- Node.js installed
- PostgreSQL, Redis, and Kafka containers running

## Step 1: Start Infrastructure

```bash
# Start all infrastructure services
docker-compose up -d postgres redis kafka

# Wait for services to be healthy (check logs)
docker-compose logs -f postgres
# Press Ctrl+C when you see "database system is ready to accept connections"
```

## Step 2: Start Project Management Service

```bash
# In terminal 1
npm run start:project-management

# You should see:
# 🚀 Project Management Service running on port 3004
```

## Step 3: Create a Project

```bash
curl -X POST http://localhost:3004/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Feedback Sentiment Analysis",
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "description": "Analyze customer feedback for sentiment and topics",
    "projectType": "TEXT",
    "createdBy": "660e8400-e29b-41d4-a716-446655440000",
    "supportedFileTypes": ["TXT", "CSV"],
    "qualityThresholds": {
      "minimumScore": 85
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "PROJECT-UUID-HERE",
    "name": "Customer Feedback Sentiment Analysis",
    ...
  }
}
```

**Save the PROJECT-UUID for next steps!**

## Step 4: Add Annotation Questions

```bash
# Replace {PROJECT-UUID} with your actual project ID
curl -X POST http://localhost:3004/api/v1/projects/{PROJECT-UUID}/annotation-questions \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      {
        "id": "sentiment",
        "question": "What is the overall sentiment of this feedback?",
        "questionType": "SINGLE_SELECT",
        "required": true,
        "options": [
          {
            "id": "positive",
            "label": "Positive",
            "value": "positive"
          },
          {
            "id": "negative",
            "label": "Negative",
            "value": "negative"
          },
          {
            "id": "neutral",
            "label": "Neutral",
            "value": "neutral"
          },
          {
            "id": "mixed",
            "label": "Mixed",
            "value": "mixed"
          }
        ]
      },
      {
        "id": "topics",
        "question": "What topics are mentioned? (Select all that apply)",
        "questionType": "MULTI_SELECT",
        "required": true,
        "options": [
          {
            "id": "product_quality",
            "label": "Product Quality",
            "value": "product_quality"
          },
          {
            "id": "customer_service",
            "label": "Customer Service",
            "value": "customer_service"
          },
          {
            "id": "pricing",
            "label": "Pricing",
            "value": "pricing"
          },
          {
            "id": "delivery",
            "label": "Delivery",
            "value": "delivery"
          },
          {
            "id": "other",
            "label": "Other",
            "value": "other"
          }
        ]
      },
      {
        "id": "confidence",
        "question": "How confident are you in your assessment? (0-100)",
        "questionType": "NUMBER",
        "required": true,
        "validation": {
          "min": 0,
          "max": 100
        }
      },
      {
        "id": "notes",
        "question": "Additional notes or context",
        "questionType": "TEXT",
        "required": false,
        "validation": {
          "maxLength": 500
        }
      }
    ]
  }'
```

## Step 5: Configure Multi-Annotator Workflow

```bash
curl -X POST http://localhost:3004/api/v1/projects/{PROJECT-UUID}/workflow-configuration \
  -H "Content-Type: application/json" \
  -d '{
    "annotatorsPerTask": 3,
    "reviewLevels": [
      {
        "level": 1,
        "name": "Initial Review - QA Team",
        "reviewersCount": 2,
        "requireAllApprovals": true,
        "approvalThreshold": 100,
        "autoAssign": true,
        "allowedReviewers": []
      },
      {
        "level": 2,
        "name": "Senior Review - Team Lead",
        "reviewersCount": 1,
        "requireAllApprovals": true,
        "approvalThreshold": 100,
        "autoAssign": false,
        "allowedReviewers": []
      },
      {
        "level": 3,
        "name": "Final Approval - Ops Manager",
        "reviewersCount": 1,
        "requireAllApprovals": true,
        "approvalThreshold": 100,
        "autoAssign": true,
        "allowedReviewers": []
      }
    ],
    "approvalCriteria": {
      "requireAllAnnotatorConsensus": true,
      "consensusThreshold": 80,
      "qualityScoreMinimum": 85,
      "autoApproveIfQualityAbove": 95
    },
    "assignmentRules": {
      "allowSelfAssignment": false,
      "preventDuplicateAssignments": true,
      "maxConcurrentAssignments": 5,
      "assignmentTimeout": 480
    }
  }'
```

**What this configures**:
- **3 annotators** will be assigned to each task
- **3 review levels**:
  1. Level 1: 2 QA reviewers (both must approve)
  2. Level 2: 1 Team Lead (must approve)
  3. Level 3: 1 Ops Manager (must approve)
- **Consensus required**: 80% agreement between annotators
- **Quality requirement**: Minimum 85% quality score
- **Assignment rules**: No self-assignment, prevent duplicates, max 5 concurrent, 8-hour timeout

## Step 6: Verify Configuration

```bash
# Get the full project configuration
curl http://localhost:3004/api/v1/projects/{PROJECT-UUID}

# Get annotation questions
curl http://localhost:3004/api/v1/projects/{PROJECT-UUID}/annotation-questions

# Get workflow configuration
curl http://localhost:3004/api/v1/projects/{PROJECT-UUID}/workflow-configuration
```

## Step 7: View Auto-Generated XState Workflow

The system automatically created an XState workflow. To view it:

```bash
# Query the workflows table
docker exec -it welo-postgres psql -U postgres -d welo_platform -c "
  SELECT 
    id, 
    name, 
    version, 
    status,
    jsonb_pretty(xstate_definition) as workflow
  FROM workflows 
  WHERE project_id = '{PROJECT-UUID}'
  ORDER BY created_at DESC 
  LIMIT 1;
"
```

**Expected workflow states**:
1. `queued` - Task created and queued
2. `annotation` - 3 annotators working
3. `checkConsensus` - System checks if annotators agree
4. `needsMoreAnnotations` - If consensus not reached
5. `review_level_1` - QA team review (2 reviewers)
6. `review_level_2` - Team lead review (1 reviewer)
7. `review_level_3` - Ops manager review (1 reviewer)
8. `changesRequested` - If reviewer requests changes
9. `completed` - All approvals done

## How the Workflow Works in Practice

### Scenario: Annotating a Customer Feedback

1. **Task Created**:
   - File: `feedback_001.txt` (customer feedback text)
   - State: `queued`
   - `totalAssignmentsRequired` = 3

2. **Assignment Phase**:
   - 3 annotators assigned: Alice, Bob, Charlie
   - State: `annotation`
   - Each gets an `Assignment` record with `assignmentOrder` = 1, 2, 3

3. **Annotation Phase**:
   - Alice submits:
     - Sentiment: "Positive"
     - Topics: ["Product Quality", "Customer Service"]
     - Confidence: 95
     - Notes: "Very satisfied customer"
   - Bob submits:
     - Sentiment: "Positive"
     - Topics: ["Product Quality", "Delivery"]
     - Confidence: 90
     - Notes: "Happy with product and delivery"
   - Charlie submits:
     - Sentiment: "Positive"
     - Topics: ["Product Quality"]
     - Confidence: 85
     - Notes: "Good quality mentioned"
   - State: `checkConsensus`

4. **Consensus Check**:
   - System calculates agreement:
     - Sentiment: 3/3 agree = 100% consensus ✓
     - Topics: Product Quality mentioned by all, others vary
     - Overall consensus: 85% ✓ (above 80% threshold)
   - State: `review_level_1`
   - 2 QA reviewers assigned: Dana, Eve

5. **Review Level 1** (QA Team):
   - Dana reviews:
     - **Action**: APPROVE
     - Comments: "Good annotations, consensus reached"
   - Eve reviews:
     - **Action**: APPROVE
     - Comments: "Agree with annotations"
   - Both approved → State: `review_level_2`

6. **Review Level 2** (Team Lead):
   - Frank (team lead) assigned
   - **Action**: REQUEST_CHANGES
   - Requested changes:
     ```json
     [
       {
         "field": "topics",
         "currentValue": ["Product Quality"],
         "suggestedValue": ["Product Quality", "Customer Service"],
         "reason": "Charlie missed customer service mention in text"
       }
     ]
     ```
   - State: `changesRequested` → `annotation`

7. **Resubmission**:
   - Charlie resubmits with corrected topics
   - State: `checkConsensus` → `review_level_1` (approved) → `review_level_2`

8. **Review Level 2** (Retry):
   - Frank reviews again:
     - **Action**: APPROVE
     - Comments: "Changes applied correctly"
   - State: `review_level_3`

9. **Review Level 3** (Final Approval):
   - Grace (ops manager) assigned
   - **Action**: APPROVE
   - Comments: "Approved for delivery"
   - State: `completed`
   - `allReviewsApproved` = true

10. **Task Complete**:
    - All 3 annotations saved
    - All 3 review levels approved
    - Quality score: 92% (average of annotator confidence)
    - Ready for export

## Database State After Completion

```sql
-- Task record
SELECT 
  id,
  status,
  current_review_level,
  max_review_level,
  all_reviews_approved,
  consensus_reached,
  consensus_score,
  total_assignments_required,
  completed_assignments
FROM tasks
WHERE id = 'TASK-UUID';

-- Output:
-- status: COMPLETED
-- current_review_level: 3
-- max_review_level: 3
-- all_reviews_approved: true
-- consensus_reached: true
-- consensus_score: 85.00
-- total_assignments_required: 3
-- completed_assignments: 3

-- Assignments (3 annotators)
SELECT 
  user_id,
  assignment_order,
  status,
  completed_at
FROM assignments
WHERE task_id = 'TASK-UUID'
ORDER BY assignment_order;

-- Review Approvals (6 total: 2+1+1 reviewers, plus 1 retry)
SELECT 
  reviewer_id,
  review_level,
  status,
  comments
FROM review_approvals
WHERE task_id = 'TASK-UUID'
ORDER BY review_level, created_at;

-- Annotation Responses (3 annotators × 4 questions = 12 responses)
SELECT 
  assignment_id,
  question_id,
  question_type,
  response,
  confidence_score
FROM annotation_responses
WHERE task_id = 'TASK-UUID'
ORDER BY assignment_id, created_at;
```

## Testing Different Scenarios

### Scenario 1: Rejection at First Review
```bash
# Reviewer rejects instead of approving
# Event: REJECT
# Result: State goes back to 'annotation', original annotators notified
```

### Scenario 2: No Consensus Reached
```bash
# 3 annotators submit vastly different answers
# Consensus score: 45% (below 80% threshold)
# State: needsMoreAnnotations
# Action: Assign 2 more annotators for tie-breaking
```

### Scenario 3: Auto-Approval
```bash
# High quality annotations with 98% quality score
# Config has autoApproveIfQualityAbove: 95
# Result: Skip all review levels, go straight to completed
```

## Common Operations

### Update Annotators Per Task
```bash
curl -X PATCH http://localhost:3004/api/v1/projects/{PROJECT-UUID}/workflow-configuration/annotators-per-task \
  -H "Content-Type: application/json" \
  -d '{"count": 5}'
```

### Add Another Review Level
```bash
curl -X POST http://localhost:3004/api/v1/projects/{PROJECT-UUID}/workflow-configuration/review-levels \
  -H "Content-Type: application/json" \
  -d '{
    "level": 4,
    "name": "Executive Review",
    "reviewersCount": 1,
    "requireAllApprovals": true,
    "autoAssign": false
  }'
```

### Update a Question
```bash
curl -X PATCH http://localhost:3004/api/v1/projects/{PROJECT-UUID}/annotation-questions/sentiment \
  -H "Content-Type: application/json" \
  -d '{
    "required": false
  }'
```

### Get Project Statistics
```bash
curl http://localhost:3004/api/v1/projects/{PROJECT-UUID}/statistics

# Response:
{
  "success": true,
  "data": {
    "totalTasks": 1000,
    "completedTasks": 850,
    "inProgressTasks": 120,
    "queuedTasks": 30,
    "completionRate": 85.0,
    "averageQualityScore": 91.5
  }
}
```

## Troubleshooting

### Service Not Starting
```bash
# Check if port 3004 is already in use
netstat -ano | findstr :3004

# Check logs
docker-compose logs project-management
```

### Database Connection Error
```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Test connection
docker exec -it welo-postgres psql -U postgres -d welo_platform -c "\dt"
```

### XState Workflow Not Created
```bash
# Check workflows table
docker exec -it welo-postgres psql -U postgres -d welo_platform -c "
  SELECT id, project_id, name, status 
  FROM workflows 
  WHERE project_id = '{PROJECT-UUID}';
"

# If empty, the workflow configuration API call might have failed
# Check service logs for errors
```

## Next Steps

1. Start the **Workflow Engine** service to execute workflows
2. Start the **Task Management** service to create tasks
3. Start the **Auth Service** for user management
4. Create users with different roles (annotator, reviewer, ops_manager)
5. Upload batch files and create tasks
6. Assign tasks to annotators
7. Monitor task progress through review levels

## Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│                  Ops Manager                        │
│  (Sets up project, questions, workflow config)      │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│             Project Management Service              │
│  - Stores questions in project.configuration        │
│  - Stores workflow config in project.configuration  │
│  - Auto-generates XState workflow                   │
│  - Saves workflow to workflows table                │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              Task Management Service                │
│  - Creates tasks with project configuration         │
│  - Assigns multiple annotators per task             │
│  - Tracks consensus and review progress             │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│               Workflow Engine Service               │
│  - Executes XState workflow                         │
│  - Processes events (SUBMIT, APPROVE, REJECT)       │
│  - Manages state transitions                        │
│  - Logs all transitions in state_transitions table  │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              PostgreSQL Database                    │
│  - projects (with questions & workflow config)      │
│  - workflows (XState definitions)                   │
│  - tasks (with review tracking)                     │
│  - assignments (multi-annotator)                    │
│  - review_approvals (git-like reviews)              │
│  - annotation_responses (question answers)          │
└─────────────────────────────────────────────────────┘
```

## Success!

You now have a complete project management system with:
✅ Custom annotation questions (multi-select, text, number, date)
✅ Multiple annotators per task (configurable count)
✅ Git-like multi-level review process (unlimited levels)
✅ Automatic XState workflow generation
✅ Consensus tracking and quality scoring
✅ Change request and resubmission support

Ready to annotate! 🎉
