# Welo Data Annotation Platform - API Specification

## Overview
RESTful API specification for the Welo Data Annotation Platform. All endpoints use JSON for request/response bodies unless otherwise specified.

**Base URL**: `https://api.welo.platform/v1`

**Authentication**: Bearer token (JWT) in Authorization header
```
Authorization: Bearer <access_token>
```

---

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "2026-02-03T10:30:00Z",
    "request_id": "uuid"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  },
  "metadata": {
    "timestamp": "2026-02-03T10:30:00Z",
    "request_id": "uuid"
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "page_size": 50,
    "total_items": 235,
    "total_pages": 5,
    "has_next": true,
    "has_previous": false
  }
}
```

---

## 1. Authentication & Authorization

### 1.1 Login
```
POST /auth/login
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 3600,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "ANNOTATOR",
      "permissions": ["task.read", "task.update"]
    }
  }
}
```

### 1.2 Refresh Token
```
POST /auth/refresh
```

**Request:**
```json
{
  "refresh_token": "refresh_token"
}
```

### 1.3 Logout
```
POST /auth/logout
```

---

## 2. Projects

### 2.1 List Projects
```
GET /projects?page=1&page_size=50&status=ACTIVE&customer_id=uuid
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `page_size` (optional): Items per page (default: 50, max: 100)
- `status` (optional): Filter by status
- `customer_id` (optional): Filter by customer
- `search` (optional): Search by name or description

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Medical Image Annotation",
      "customer_id": "uuid",
      "status": "ACTIVE",
      "project_type": "IMAGE",
      "total_batches": 15,
      "total_tasks": 5000,
      "completed_tasks": 3200,
      "created_at": "2026-01-15T10:00:00Z",
      "due_date": "2026-03-31T23:59:59Z"
    }
  ],
  "pagination": { ... }
}
```

### 2.2 Get Project
```
GET /projects/{project_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Medical Image Annotation",
    "customer_id": "uuid",
    "description": "Annotate medical scans for tumor detection",
    "project_type": "IMAGE",
    "status": "ACTIVE",
    "configuration": {
      "annotation_schema": { ... },
      "quality_thresholds": {
        "minimum_score": 85,
        "review_threshold": 70
      },
      "workflow_rules": { ... },
      "ui_configuration": { ... }
    },
    "statistics": {
      "total_batches": 15,
      "total_tasks": 5000,
      "completed_tasks": 3200,
      "in_progress_tasks": 800,
      "average_quality_score": 92.5
    },
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-02-01T14:30:00Z"
  }
}
```

### 2.3 Create Project
```
POST /projects
```

**Request:**
```json
{
  "name": "New Annotation Project",
  "customer_id": "uuid",
  "description": "Project description",
  "project_type": "TEXT",
  "configuration": {
    "annotation_schema": {
      "labels": ["PERSON", "LOCATION", "ORGANIZATION"],
      "attributes": { ... }
    },
    "quality_thresholds": {
      "minimum_score": 80
    }
  },
  "start_date": "2026-02-10",
  "end_date": "2026-06-30"
}
```

### 2.4 Update Project
```
PATCH /projects/{project_id}
```

**Request:** (partial update)
```json
{
  "status": "PAUSED",
  "configuration": {
    "quality_thresholds": {
      "minimum_score": 90
    }
  }
}
```

### 2.5 Delete Project
```
DELETE /projects/{project_id}
```

---

## 3. Batches

### 3.1 List Batches
```
GET /projects/{project_id}/batches?status=IN_PROGRESS&page=1&page_size=50
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "name": "Batch 001",
      "status": "IN_PROGRESS",
      "priority": 8,
      "total_tasks": 500,
      "completed_tasks": 320,
      "quality_score": 91.2,
      "created_at": "2026-01-20T08:00:00Z",
      "due_date": "2026-02-15T23:59:59Z"
    }
  ],
  "pagination": { ... }
}
```

### 3.2 Get Batch
```
GET /batches/{batch_id}
```

### 3.3 Create Batch
```
POST /projects/{project_id}/batches
```

**Request:**
```json
{
  "name": "Batch 002",
  "description": "Second batch of tasks",
  "priority": 7,
  "due_date": "2026-03-01T23:59:59Z",
  "configuration": {
    "assignment_rules": {
      "auto_assign": true,
      "tasks_per_annotator": 50,
      "skill_requirements": ["medical_imaging"]
    },
    "validation_rules": {
      "consensus_count": 2,
      "review_percentage": 20
    }
  }
}
```

### 3.4 Update Batch
```
PATCH /batches/{batch_id}
```

### 3.5 Batch Statistics
```
GET /batches/{batch_id}/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "batch_id": "uuid",
    "total_tasks": 500,
    "completed_tasks": 320,
    "in_progress_tasks": 80,
    "queued_tasks": 100,
    "quality_metrics": {
      "average_score": 91.2,
      "pass_rate": 94.5,
      "average_time_per_task": 180
    },
    "progress_by_stage": {
      "annotation": 420,
      "review": 60,
      "validation": 20
    }
  }
}
```

---

## 4. Tasks

### 4.1 List Tasks
```
GET /batches/{batch_id}/tasks?status=QUEUED&priority=8&page=1
```

**Query Parameters:**
- `status` (optional): Filter by status
- `priority` (optional): Filter by priority
- `assigned_to` (optional): Filter by user ID
- `task_type` (optional): Filter by type

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "batch_id": "uuid",
      "project_id": "uuid",
      "external_id": "TASK-001",
      "task_type": "ANNOTATION",
      "status": "QUEUED",
      "priority": 8,
      "estimated_duration": 300,
      "created_at": "2026-02-01T10:00:00Z",
      "due_date": "2026-02-05T23:59:59Z"
    }
  ],
  "pagination": { ... }
}
```

### 4.2 Get Task
```
GET /tasks/{task_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "batch_id": "uuid",
    "project_id": "uuid",
    "external_id": "TASK-001",
    "task_type": "ANNOTATION",
    "status": "ASSIGNED",
    "priority": 8,
    "data_payload": {
      "source_data": {
        "text": "Sample text to annotate...",
        "url": "https://storage.welo.com/data/file.jpg"
      },
      "references": ["ref1", "ref2"],
      "context": {
        "guidelines_url": "https://..."
      }
    },
    "assignment": {
      "id": "uuid",
      "user_id": "uuid",
      "assigned_at": "2026-02-02T09:00:00Z",
      "expires_at": "2026-02-02T17:00:00Z"
    },
    "annotations": [],
    "created_at": "2026-02-01T10:00:00Z",
    "estimated_duration": 300
  }
}
```

### 4.3 Create Tasks (Bulk)
```
POST /batches/{batch_id}/tasks/bulk
```

**Request:**
```json
{
  "tasks": [
    {
      "external_id": "TASK-001",
      "task_type": "ANNOTATION",
      "priority": 5,
      "data_payload": {
        "source_data": {
          "text": "Sample text..."
        }
      },
      "estimated_duration": 300
    },
    {
      "external_id": "TASK-002",
      "task_type": "ANNOTATION",
      "priority": 5,
      "data_payload": {
        "source_data": {
          "image_url": "https://..."
        }
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "created_count": 2,
    "failed_count": 0,
    "task_ids": ["uuid1", "uuid2"],
    "errors": []
  }
}
```

### 4.4 Update Task
```
PATCH /tasks/{task_id}
```

**Request:**
```json
{
  "status": "SKIPPED",
  "priority": 9,
  "metadata": {
    "skip_reason": "Low quality source data"
  }
}
```

### 4.5 Get Next Task (for Annotator)
```
GET /queues/{queue_id}/next-task
```

**Response:**
```json
{
  "success": true,
  "data": {
    "task": { ... },
    "assignment": {
      "id": "uuid",
      "expires_at": "2026-02-03T18:00:00Z"
    }
  }
}
```

---

## 5. Assignments

### 5.1 Assign Task
```
POST /tasks/{task_id}/assign
```

**Request:**
```json
{
  "user_id": "uuid",
  "workflow_stage": "ANNOTATION",
  "expires_in": 28800
}
```

### 5.2 Accept Assignment
```
POST /assignments/{assignment_id}/accept
```

### 5.3 Release Assignment
```
POST /assignments/{assignment_id}/release
```

**Request:**
```json
{
  "reason": "Cannot complete task"
}
```

### 5.4 Get User Assignments
```
GET /users/{user_id}/assignments?status=IN_PROGRESS
```

---

## 6. Annotations

### 6.1 Submit Annotation
```
POST /tasks/{task_id}/annotations
```

**Request:**
```json
{
  "assignment_id": "uuid",
  "annotation_data": {
    "labels": [
      {
        "start": 0,
        "end": 10,
        "label": "PERSON",
        "text": "John Smith"
      }
    ],
    "entities": [],
    "relationships": [],
    "attributes": {
      "sentiment": "positive"
    }
  },
  "confidence_score": 0.95,
  "time_spent": 285
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "annotation_id": "uuid",
    "task_id": "uuid",
    "status": "SUBMITTED",
    "created_at": "2026-02-03T10:45:00Z"
  }
}
```

### 6.2 Get Annotations
```
GET /tasks/{task_id}/annotations
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "task_id": "uuid",
      "user_id": "uuid",
      "annotation_data": { ... },
      "version": 1,
      "is_final": false,
      "confidence_score": 0.95,
      "time_spent": 285,
      "submitted_at": "2026-02-03T10:45:00Z"
    }
  ]
}
```

### 6.3 Update Annotation
```
PATCH /annotations/{annotation_id}
```

### 6.4 Compare Annotations
```
POST /tasks/{task_id}/annotations/compare
```

**Request:**
```json
{
  "annotation_ids": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agreement_score": 0.87,
    "differences": [
      {
        "field": "labels[0].label",
        "annotation_1": "PERSON",
        "annotation_2": "ORGANIZATION"
      }
    ],
    "metrics": {
      "precision": 0.92,
      "recall": 0.89,
      "f1_score": 0.90
    }
  }
}
```

---

## 7. Quality Checks

### 7.1 Create Quality Check
```
POST /tasks/{task_id}/quality-checks
```

**Request:**
```json
{
  "annotation_id": "uuid",
  "check_type": "MANUAL",
  "quality_score": 85,
  "status": "PASS",
  "issues": [
    {
      "category": "MISSING_LABEL",
      "severity": "MEDIUM",
      "description": "Entity at position 45-52 not labeled",
      "location": {
        "start": 45,
        "end": 52
      }
    }
  ],
  "feedback": "Good work overall, but missed one entity."
}
```

### 7.2 Get Quality Checks
```
GET /tasks/{task_id}/quality-checks
```

### 7.3 Run Automated Quality Check
```
POST /batches/{batch_id}/quality-checks/automated
```

**Request:**
```json
{
  "check_rules": ["completeness", "consistency", "format_validation"],
  "sample_percentage": 20
}
```

### 7.4 Quality Metrics
```
GET /projects/{project_id}/quality-metrics?start_date=2026-01-01&end_date=2026-02-03
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overall_quality_score": 89.5,
    "total_checks": 1500,
    "pass_rate": 91.2,
    "metrics_by_annotator": [
      {
        "user_id": "uuid",
        "quality_score": 92.3,
        "checks_count": 200,
        "pass_rate": 95.5
      }
    ],
    "common_issues": [
      {
        "category": "MISSING_LABEL",
        "count": 45,
        "percentage": 3.0
      }
    ]
  }
}
```

---

## 8. Queues

### 8.1 List Queues
```
GET /projects/{project_id}/queues
```

### 8.2 Get Queue
```
GET /queues/{queue_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Annotation Queue",
    "project_id": "uuid",
    "queue_type": "ANNOTATION",
    "status": "ACTIVE",
    "total_tasks": 500,
    "pending_tasks": 250,
    "assigned_tasks": 150,
    "completed_tasks": 100,
    "priority_rules": {
      "priority_field": "priority",
      "sort_order": "DESC"
    },
    "assignment_rules": {
      "auto_assign": true,
      "capacity_limits": {
        "max_per_user": 20
      }
    }
  }
}
```

### 8.3 Create Queue
```
POST /projects/{project_id}/queues
```

### 8.4 Update Queue
```
PATCH /queues/{queue_id}
```

### 8.5 Queue Statistics
```
GET /queues/{queue_id}/statistics
```

---

## 9. Workflows (XState)

### 9.1 List Workflows
```
GET /projects/{project_id}/workflows?status=ACTIVE&is_template=false
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Standard Annotation Workflow",
      "version": 2,
      "status": "ACTIVE",
      "is_template": false,
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

### 9.2 Get Workflow
```
GET /workflows/{workflow_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "project_id": "uuid",
    "name": "Standard Annotation Workflow",
    "version": 2,
    "xstate_definition": {
      "id": "annotationWorkflow",
      "initial": "queued",
      "context": {
        "taskId": null,
        "assignedTo": null,
        "attempts": 0,
        "qualityScore": 0
      },
      "states": {
        "queued": {
          "on": {
            "ASSIGN": {
              "target": "assigned",
              "actions": ["assignToUser", "notifyUser"]
            }
          },
          "meta": {
            "description": "Task waiting in queue"
          }
        },
        "assigned": {
          "entry": ["startTimer"],
          "on": {
            "START": "inProgress",
            "EXPIRE": "queued",
            "RELEASE": "queued"
          },
          "after": {
            "ASSIGNMENT_TIMEOUT": "queued"
          }
        },
        "inProgress": {
          "on": {
            "SUBMIT": {
              "target": "review",
              "actions": ["saveAnnotation"]
            },
            "SAVE_DRAFT": {
              "target": "inProgress",
              "internal": true,
              "actions": ["saveDraft"]
            }
          }
        },
        "review": {
          "invoke": {
            "id": "qualityCheck",
            "src": "performQualityCheck",
            "onDone": {
              "target": "approved",
              "cond": "qualityPassed",
              "actions": ["updateQualityScore"]
            },
            "onError": "inProgress"
          },
          "on": {
            "REJECT": {
              "target": "inProgress",
              "actions": ["sendFeedback"]
            }
          }
        },
        "approved": {
          "type": "final",
          "entry": ["markComplete", "notifyCompletion"]
        }
      },
      "guards": {
        "qualityPassed": {
          "type": "qualityThreshold",
          "params": {
            "minScore": 85
          }
        }
      },
      "actions": {
        "assignToUser": "assign",
        "notifyUser": "sendNotification",
        "saveAnnotation": "persistAnnotation",
        "saveDraft": "persistDraft"
      },
      "services": {
        "performQualityCheck": "qualityCheckService"
      },
      "delays": {
        "ASSIGNMENT_TIMEOUT": 28800000
      }
    },
    "state_schema": {
      "states": {
        "queued": {},
        "assigned": {},
        "inProgress": {},
        "review": {},
        "approved": {}
      },
      "context": {
        "taskId": "string",
        "assignedTo": "string",
        "attempts": "number",
        "qualityScore": "number"
      }
    },
    "event_schema": [
      {
        "event_type": "ASSIGN",
        "payload_schema": {
          "userId": "string"
        },
        "description": "Assign task to user"
      },
      {
        "event_type": "SUBMIT",
        "payload_schema": {
          "annotationData": "object"
        },
        "description": "Submit annotation"
      }
    ],
    "status": "ACTIVE"
  }
}
```

### 9.3 Create Workflow
```
POST /projects/{project_id}/workflows
```

**Request:**
```json
{
  "name": "Custom Review Workflow",
  "description": "Multi-stage review workflow with consensus",
  "xstate_definition": {
    "id": "customWorkflow",
    "initial": "pending",
    "context": {},
    "states": { ... }
  },
  "state_schema": { ... },
  "event_schema": [ ... ],
  "is_template": false
}
```

### 9.4 Update Workflow
```
PATCH /workflows/{workflow_id}
```

### 9.5 Validate Workflow
```
POST /workflows/{workflow_id}/validate
```

**Response:**
```json
{
  "success": true,
  "data": {
    "is_valid": true,
    "errors": [],
    "warnings": [
      "State 'review' has no error handling"
    ],
    "visualization_url": "https://stately.ai/viz/..."
  }
}
```

### 9.6 Get Workflow Visualization
```
GET /workflows/{workflow_id}/visualization
```

Returns Mermaid diagram or image representation of the state machine.

### 9.7 Simulate Workflow
```
POST /workflows/{workflow_id}/simulate
```

**Request:**
```json
{
  "initial_context": {
    "taskId": "test-123",
    "assignedTo": "user-uuid"
  },
  "events": [
    {"type": "START"},
    {"type": "SUBMIT", "payload": {...}}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "final_state": "review",
    "final_context": { ... },
    "transitions": [
      {
        "from": "assigned",
        "to": "inProgress",
        "event": "START"
      },
      {
        "from": "inProgress",
        "to": "review",
        "event": "SUBMIT"
      }
    ],
    "actions_executed": ["assignToUser", "saveAnnotation"]
  }
}
```

---

## 10. XState Events & State Management

### 10.1 Send Event to Task
```
POST /tasks/{task_id}/events
```

**Request:**
```json
{
  "type": "SUBMIT",
  "payload": {
    "annotationData": { ... },
    "confidence": 0.95
  },
  "timestamp": "2026-02-03T10:45:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transition_id": "uuid",
    "previous_state": {
      "value": "inProgress",
      "context": { ... }
    },
    "current_state": {
      "value": "review",
      "context": { ... },
      "changed": true,
      "tags": ["pending_review"]
    },
    "actions_executed": [
      {
        "action": "saveAnnotation",
        "result": "success"
      }
    ]
  }
}
```

### 10.2 Get Current State
```
GET /tasks/{task_id}/state
```

**Response:**
```json
{
  "success": true,
  "data": {
    "task_id": "uuid",
    "workflow_id": "uuid",
    "current_state": {
      "value": "inProgress",
      "context": {
        "taskId": "uuid",
        "assignedTo": "user-uuid",
        "attempts": 1,
        "startTime": "2026-02-03T10:00:00Z"
      },
      "tags": ["active"],
      "done": false
    },
    "next_events": ["SUBMIT", "SAVE_DRAFT"],
    "can_transition": true,
    "state_updated_at": "2026-02-03T10:00:00Z"
  }
}
```

### 10.3 Get State History
```
GET /tasks/{task_id}/state-history?limit=50
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "transition_id": "uuid",
      "from_state": "assigned",
      "to_state": "inProgress",
      "event": {
        "type": "START",
        "timestamp": "2026-02-03T10:00:00Z"
      },
      "user_id": "uuid",
      "duration": 45
    }
  ]
}
```

### 10.4 Restore State
```
POST /tasks/{task_id}/state/restore
```

**Request:**
```json
{
  "transition_id": "uuid",
  "reason": "Reverting incorrect state change"
}
```

### 10.5 Batch Event Send
```
POST /events/batch
```

**Request:**
```json
{
  "events": [
    {
      "entity_type": "TASK",
      "entity_id": "uuid1",
      "event": {"type": "APPROVE"}
    },
    {
      "entity_type": "TASK",
      "entity_id": "uuid2",
      "event": {"type": "REJECT", "payload": {...}}
    }
  ]
}
```

### 10.6 Query Tasks by State
```
GET /tasks/by-state?workflow_id=uuid&state=inProgress&project_id=uuid
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "task_id": "uuid",
      "current_state": "inProgress",
      "context": { ... },
      "time_in_state": 1800
    }
  ]
}
```

### 10.7 Get Possible Transitions
```
GET /tasks/{task_id}/transitions
```

**Response:**
```json
{
  "success": true,
  "data": {
    "current_state": "inProgress",
    "possible_events": [
      {
        "event_type": "SUBMIT",
        "target_state": "review",
        "guards": ["hasAnnotation"],
        "can_execute": true
      },
      {
        "event_type": "SAVE_DRAFT",
        "target_state": "inProgress",
        "internal": true,
        "can_execute": true
      }
    ]
  }
}
```

---

## 11. Workflow Instances (XState Actors)

### 11.1 Create Workflow Instance
```
POST /batches/{batch_id}/workflow-instances
```

**Request:**
```json
{
  "workflow_id": "uuid",
  "name": "Batch Processing Instance",
  "initial_context": {
    "batchId": "uuid",
    "totalTasks": 500,
    "priority": 8
  }
}
```

### 11.2 Get Workflow Instance
```
GET /workflow-instances/{instance_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workflow_id": "uuid",
    "batch_id": "uuid",
    "actor_state": {
      "value": {
        "processing": {
          "annotation": "active",
          "review": "active"
        }
      },
      "context": {
        "completedTasks": 250,
        "totalTasks": 500
      },
      "children": {
        "taskActor1": "running",
        "taskActor2": "running"
      }
    },
    "status": "RUNNING",
    "started_at": "2026-02-01T10:00:00Z"
  }
}
```

### 11.3 Send Event to Instance
```
POST /workflow-instances/{instance_id}/events
```

### 11.4 Pause Instance
```
POST /workflow-instances/{instance_id}/pause
```

### 11.5 Resume Instance
```
POST /workflow-instances/{instance_id}/resume
```

### 11.6 Stop Instance
```
POST /workflow-instances/{instance_id}/stop
```

**Request:**
```json
{
  "reason": "Manual stop by admin",
  "force": false
}
```

### 11.7 Get Instance Snapshot
```
GET /workflow-instances/{instance_id}/snapshot
```

**Response:**
Returns complete persisted state for restoration.

### 11.8 Restore from Snapshot
```
POST /workflow-instances/{instance_id}/restore
```

**Request:**
```json
{
  "snapshot": { ... },
  "checkpoint_id": "uuid"
}
```

### 11.9 List Child Actors
```
GET /workflow-instances/{instance_id}/actors
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "actor_ref_id": "taskActor1",
      "actor_type": "CHILD",
      "state": "running",
      "parent_instance_id": "uuid"
    }
  ]
}
```

---

## 12. State Transitions (Audit)

### 12.1 Get Transition Details
```
GET /state-transitions/{transition_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "entity_type": "TASK",
    "entity_id": "uuid",
    "workflow_id": "uuid",
    "event": {
      "type": "SUBMIT",
      "payload": { ... },
      "timestamp": "2026-02-03T10:45:00Z"
    },
    "from_state": {
      "value": "inProgress",
      "context": { ... }
    },
    "to_state": {
      "value": "review",
      "context": { ... }
    },
    "transition_type": "EXTERNAL",
    "guards_evaluated": [
      {
        "guard_name": "hasAnnotation",
        "result": true
      }
    ],
    "actions_executed": [
      {
        "action_name": "saveAnnotation",
        "action_type": "TRANSITION",
        "execution_time": 45,
        "result": {"success": true}
      }
    ],
    "user_id": "uuid",
    "duration": 52
  }
}
```

### 12.2 Query Transitions
```
GET /state-transitions?entity_type=TASK&workflow_id=uuid&event_type=SUBMIT&from_date=2026-02-01
```

### 12.3 Transition Analytics
```
GET /analytics/transitions?workflow_id=uuid&period=7d
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_transitions": 5000,
    "transition_breakdown": {
      "queued → assigned": 2000,
      "assigned → inProgress": 1800,
      "inProgress → review": 1200
    },
    "average_duration_by_transition": {
      "queued → assigned": 120,
      "assigned → inProgress": 45
    },
    "failed_transitions": 15,
    "most_common_events": [
      {"type": "START", "count": 1800},
      {"type": "SUBMIT", "count": 1200}
    ]
  }
}
```

---

## 13. Exports

### 13.1 Create Export
```
POST /batches/{batch_id}/exports
```

**Request:**
```json
{
  "export_type": "FULL",
  "format": "JSON",
  "filter_criteria": {
    "status": ["APPROVED"],
    "quality_score_min": 85
  },
  "configuration": {
    "include_metadata": true,
    "include_quality_metrics": true,
    "anonymize": false,
    "compression": "gzip"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "export_id": "uuid",
    "status": "PENDING",
    "estimated_completion": "2026-02-03T11:15:00Z"
  }
}
```

### 13.2 Get Export Status
```
GET /exports/{export_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "batch_id": "uuid",
    "status": "COMPLETED",
    "format": "JSON",
    "file_url": "https://downloads.welo.com/exports/uuid.json.gz",
    "file_size": 52428800,
    "record_count": 5000,
    "created_at": "2026-02-03T11:00:00Z",
    "completed_at": "2026-02-03T11:10:00Z",
    "expires_at": "2026-03-05T11:10:00Z"
  }
}
```

### 13.3 Download Export
```
GET /exports/{export_id}/download
```

Returns the export file with appropriate content-type headers.

### 13.4 List Exports
```
GET /batches/{batch_id}/exports?status=COMPLETED
```

---

## 14. Users

### 14.1 List Users
```
GET /users?role=ANNOTATOR&status=ACTIVE&page=1
```

### 14.2 Get User
```
GET /users/{user_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "annotator@example.com",
    "username": "annotator001",
    "first_name": "Jane",
    "last_name": "Doe",
    "role": "ANNOTATOR",
    "status": "ACTIVE",
    "skills": [
      {
        "skill_name": "medical_imaging",
        "proficiency": "EXPERT",
        "certified_at": "2025-06-15T00:00:00Z"
      }
    ],
    "performance_metrics": {
      "tasks_completed": 1250,
      "average_quality": 91.5,
      "average_speed": 245,
      "accuracy_rate": 94.2
    },
    "created_at": "2025-01-10T08:00:00Z",
    "last_login_at": "2026-02-03T09:15:00Z"
  }
}
```

### 14.3 Create User
```
POST /users
```

**Request:**
```json
{
  "email": "newuser@example.com",
  "username": "newuser",
  "first_name": "John",
  "last_name": "Smith",
  "role": "ANNOTATOR",
  "password": "securepassword",
  "skills": [
    {
      "skill_name": "text_annotation",
      "proficiency": "INTERMEDIATE"
    }
  ]
}
```

### 14.4 Update User
```
PATCH /users/{user_id}
```

### 14.5 User Performance
```
GET /users/{user_id}/performance?start_date=2026-01-01&end_date=2026-02-03
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "period": {
      "start_date": "2026-01-01",
      "end_date": "2026-02-03"
    },
    "metrics": {
      "tasks_completed": 350,
      "average_quality_score": 92.1,
      "average_time_per_task": 240,
      "accuracy_rate": 95.3,
      "tasks_rejected": 12,
      "rejection_rate": 3.4
    },
    "trend": {
      "quality_trend": "improving",
      "speed_trend": "stable"
    }
  }
}
```

---

## 15. Comments

### 15.1 Create Comment
```
POST /comments
```

**Request:**
```json
{
  "entity_type": "TASK",
  "entity_id": "uuid",
  "content": "This annotation needs clarification on entity boundaries.",
  "parent_comment_id": null
}
```

### 15.2 Get Comments
```
GET /comments?entity_type=TASK&entity_id=uuid
```

### 15.3 Update Comment
```
PATCH /comments/{comment_id}
```

### 15.4 Resolve Comment
```
POST /comments/{comment_id}/resolve
```

---

## 16. Notifications

### 16.1 Get Notifications
```
GET /users/{user_id}/notifications?is_read=false&page=1
```

### 16.2 Mark as Read
```
POST /notifications/{notification_id}/read
```

### 16.3 Mark All as Read
```
POST /users/{user_id}/notifications/read-all
```

---

## 17. Templates

### 17.1 List Templates
```
GET /templates?category=annotation&template_type=ANNOTATION_SCHEMA
```

### 17.2 Get Template
```
GET /templates/{template_id}
```

### 17.3 Create Template
```
POST /templates
```

**Request:**
```json
{
  "name": "Named Entity Recognition Schema",
  "category": "NLP",
  "template_type": "ANNOTATION_SCHEMA",
  "content": {
    "labels": ["PERSON", "LOCATION", "ORGANIZATION"],
    "relationships": ["WORKS_FOR", "LOCATED_IN"],
    "attributes": {
      "confidence": "number"
    }
  },
  "is_public": true
}
```

---

## 18. Analytics & Reporting

### 18.1 Dashboard Metrics
```
GET /analytics/dashboard?project_id=uuid
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_projects": 15,
      "active_projects": 8,
      "total_tasks": 50000,
      "completed_tasks": 32000,
      "completion_rate": 64.0
    },
    "quality": {
      "average_quality_score": 90.5,
      "pass_rate": 93.2
    },
    "productivity": {
      "tasks_completed_today": 450,
      "average_tasks_per_user": 25,
      "average_time_per_task": 245
    },
    "capacity": {
      "active_annotators": 45,
      "available_capacity": 1200,
      "utilization_rate": 78.5
    }
  }
}
```

### 18.2 Project Progress Report
```
GET /analytics/projects/{project_id}/progress
```

### 18.3 Annotator Productivity Report
```
GET /analytics/productivity?start_date=2026-01-01&end_date=2026-02-03&user_id=uuid
```

### 18.4 Quality Trends
```
GET /analytics/quality-trends?project_id=uuid&interval=daily&period=30
```

---

## 19. Audit Logs

### 19.1 Get Audit Logs
```
GET /audit-logs?entity_type=TASK&entity_id=uuid&page=1
```

**Query Parameters:**
- `entity_type` (optional)
- `entity_id` (optional)
- `user_id` (optional)
- `action` (optional)
- `start_date` (optional)
- `end_date` (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "entity_type": "TASK",
      "entity_id": "uuid",
      "action": "UPDATE",
      "user_id": "uuid",
      "timestamp": "2026-02-03T10:30:00Z",
      "ip_address": "192.168.1.100",
      "changes": {
        "before": {
          "status": "QUEUED"
        },
        "after": {
          "status": "ASSIGNED"
        }
      }
    }
  ],
  "pagination": { ... }
}
```

---

## 20. Health & System

### 20.1 Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.2.3",
  "timestamp": "2026-02-03T10:30:00Z",
  "services": {
    "database": "healthy",
    "cache": "healthy",
    "storage": "healthy",
    "queue": "healthy"
  }
}
```

### 20.2 System Status
```
GET /system/status
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Invalid email or password |
| `AUTH_TOKEN_EXPIRED` | 401 | Access token has expired |
| `AUTH_INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `DUPLICATE_RESOURCE` | 409 | Resource already exists |
| `TASK_ALREADY_ASSIGNED` | 409 | Task is already assigned |
| `ASSIGNMENT_EXPIRED` | 410 | Assignment has expired |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## Rate Limiting

- **Default**: 1000 requests per hour per user
- **Bulk operations**: 100 requests per hour
- **Export generation**: 20 requests per hour

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1675425600
```

---

## Webhooks (Optional)

### Webhook Events
- `task.created`
- `task.assigned`
- `task.completed`
- `annotation.submitted`
- `quality_check.completed`
- `batch.completed`
- `export.completed`
- `state.transitioned` (XState transition occurred)
- `workflow.instance.started`
- `workflow.instance.completed`
- `workflow.instance.failed`

### Webhook Payload
```json
{
  "event": "task.completed",
  "timestamp": "2026-02-03T10:45:00Z",
  "data": {
    "task_id": "uuid",
    "project_id": "uuid",
    "batch_id": "uuid",
    "status": "COMPLETED"
  }
}
```

---

## Versioning

API uses URL versioning: `/v1`, `/v2`, etc.

Current version: `v1`

---

## SDK Examples

### Python
```python
from welo_sdk import WeloClient

client = WeloClient(api_key="your_api_key")

# Get next task
task = client.queues.get_next_task(queue_id="uuid")

# Get current XState state
state = client.tasks.get_state(task_id=task.id)
print(f"Current state: {state.value}")
print(f"Next events: {state.next_events}")

# Send event to task (XState transition)
transition = client.tasks.send_event(
    task_id=task.id,
    event={
        "type": "SUBMIT",
        "payload": {
            "annotationData": {"labels": [{"start": 0, "end": 10, "label": "PERSON"}]}
        }
    }
)

# Check new state
print(f"Transitioned to: {transition.current_state.value}")
```

### JavaScript
```javascript
const WeloClient = require('welo-sdk');
const { createMachine, interpret } = require('xstate');

const client = new WeloClient({ apiKey: 'your_api_key' });

// Get workflow definition
const workflow = await client.workflows.get('workflow-uuid');

// Create local XState machine from workflow
const machine = createMachine(workflow.xstate_definition);

// Create batch with workflow
const batch = await client.batches.create(project.id, {
  name: 'New Batch',
  priority: 8,
  workflow_id: workflow.id
});

// Send event to task
const task = await client.tasks.get('task-uuid');
await client.tasks.sendEvent(task.id, {
  type: 'START',
  payload: {}
});

// Query tasks by state
const inProgressTasks = await client.tasks.byState({
  workflow_id: workflow.id,
  state: 'inProgress'
});
```

---

## Notes

1. All timestamps are in ISO 8601 format (UTC)
2. UUIDs are in standard UUID v4 format
3. File uploads use multipart/form-data
4. Large exports are asynchronous with webhook notifications
5. Pagination uses cursor-based pagination for large datasets
6. All IDs are immutable once created
7. Soft deletes are used for critical entities
8. **XState Integration**:
   - Workflow definitions follow XState v5 specification
   - State machines are compiled and cached on the server
   - Events are processed asynchronously via message queue
   - State transitions are atomic and logged for audit
   - Guards, actions, and services are executed server-side
   - Client can visualize workflows using Stately.ai or custom visualizers
   - Supports hierarchical states, parallel states, and history states
   - Actor model enables complex multi-task orchestration
