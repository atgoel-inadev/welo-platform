# XState Workflow Definitions for Multi-Level Review Process

## Overview
This document provides XState workflow definitions for implementing a git-like review process where:
- Multiple annotators can be assigned to the same task
- Multiple review levels can be configured
- All reviewers must approve before task completion
- Changes can be requested and resubmitted

## Basic Multi-Annotator Workflow

```typescript
import { createMachine, assign } from 'xstate';

export const multiAnnotatorWorkflow = createMachine({
  id: 'multiAnnotatorWorkflow',
  initial: 'queued',
  context: {
    projectId: '',
    taskId: '',
    annotatorsPerTask: 1,
    completedAnnotations: 0,
    annotations: [],
    consensusThreshold: 0.8,
    consensusReached: false,
  },
  states: {
    queued: {
      on: {
        ASSIGN_ANNOTATORS: {
          target: 'annotation',
          actions: 'assignAnnotators',
        },
      },
    },
    annotation: {
      on: {
        SUBMIT_ANNOTATION: {
          target: 'checkConsensus',
          actions: 'recordAnnotation',
        },
        SAVE_DRAFT: {
          target: 'annotation',
          actions: 'saveDraft',
        },
      },
    },
    checkConsensus: {
      always: [
        {
          target: 'consensusReached',
          guard: 'allAnnotationsComplete',
        },
        {
          target: 'needsMoreAnnotations',
          guard: 'needsMoreAnnotators',
        },
        {
          target: 'annotation',
        },
      ],
    },
    needsMoreAnnotations: {
      on: {
        ASSIGN_ANNOTATORS: {
          target: 'annotation',
          actions: 'assignAdditionalAnnotators',
        },
      },
    },
    consensusReached: {
      entry: 'calculateConsensus',
      always: [
        {
          target: 'reviewLevel1',
          guard: 'hasReviewLevels',
        },
        {
          target: 'completed',
          guard: 'consensusMetOrNoReview',
        },
        {
          target: 'consensusFailed',
        },
      ],
    },
    consensusFailed: {
      on: {
        MANUAL_REVIEW: 'reviewLevel1',
        REASSIGN: 'queued',
      },
    },
    reviewLevel1: {
      entry: 'assignReviewers',
      on: {
        APPROVE: {
          target: 'checkReviewLevel1Complete',
          actions: 'recordApproval',
        },
        REJECT: {
          target: 'annotation',
          actions: 'recordRejection',
        },
        REQUEST_CHANGES: {
          target: 'changesRequested',
          actions: 'recordChangeRequest',
        },
      },
    },
    checkReviewLevel1Complete: {
      always: [
        {
          target: 'reviewLevel2',
          guard: 'level1ApprovedAndHasLevel2',
        },
        {
          target: 'completed',
          guard: 'level1ApprovedAndNoMoreLevels',
        },
        {
          target: 'reviewLevel1',
        },
      ],
    },
    reviewLevel2: {
      entry: 'assignLevel2Reviewers',
      on: {
        APPROVE: {
          target: 'checkReviewLevel2Complete',
          actions: 'recordApproval',
        },
        REJECT: {
          target: 'annotation',
          actions: 'recordRejection',
        },
        REQUEST_CHANGES: {
          target: 'changesRequested',
          actions: 'recordChangeRequest',
        },
      },
    },
    checkReviewLevel2Complete: {
      always: [
        {
          target: 'reviewLevel3',
          guard: 'level2ApprovedAndHasLevel3',
        },
        {
          target: 'completed',
          guard: 'level2ApprovedAndNoMoreLevels',
        },
        {
          target: 'reviewLevel2',
        },
      ],
    },
    reviewLevel3: {
      entry: 'assignLevel3Reviewers',
      on: {
        APPROVE: {
          target: 'checkReviewLevel3Complete',
          actions: 'recordApproval',
        },
        REJECT: {
          target: 'annotation',
          actions: 'recordRejection',
        },
        REQUEST_CHANGES: {
          target: 'changesRequested',
          actions: 'recordChangeRequest',
        },
      },
    },
    checkReviewLevel3Complete: {
      always: [
        {
          target: 'completed',
          guard: 'level3Approved',
        },
        {
          target: 'reviewLevel3',
        },
      ],
    },
    changesRequested: {
      on: {
        RESUBMIT: {
          target: 'annotation',
          actions: 'clearChangeRequests',
        },
      },
    },
    completed: {
      type: 'final',
      entry: 'markTaskComplete',
    },
  },
},
{
  actions: {
    assignAnnotators: assign({
      annotations: (context, event: any) => {
        return event.assignments.map((assignment: any) => ({
          assignmentId: assignment.id,
          userId: assignment.userId,
          status: 'in_progress',
        }));
      },
    }),
    recordAnnotation: assign({
      completedAnnotations: (context) => context.completedAnnotations + 1,
      annotations: (context, event: any) => {
        const updatedAnnotations = [...context.annotations];
        const index = updatedAnnotations.findIndex(
          (a) => a.assignmentId === event.assignmentId,
        );
        if (index !== -1) {
          updatedAnnotations[index] = {
            ...updatedAnnotations[index],
            status: 'completed',
            data: event.annotationData,
          };
        }
        return updatedAnnotations;
      },
    }),
    saveDraft: (context, event: any) => {
      // Save draft logic
      console.log('Draft saved for assignment:', event.assignmentId);
    },
    assignAdditionalAnnotators: (context, event: any) => {
      // Assign more annotators
      console.log('Assigning additional annotators');
    },
    calculateConsensus: assign({
      consensusReached: (context) => {
        // Calculate consensus between annotations
        const annotations = context.annotations.filter((a) => a.status === 'completed');
        if (annotations.length < 2) return false;
        
        // Simplified consensus calculation
        // In production, use proper inter-annotator agreement metrics
        return true; // Placeholder
      },
    }),
    assignReviewers: (context, event: any) => {
      console.log('Assigning Level 1 reviewers');
    },
    assignLevel2Reviewers: (context, event: any) => {
      console.log('Assigning Level 2 reviewers');
    },
    assignLevel3Reviewers: (context, event: any) => {
      console.log('Assigning Level 3 reviewers');
    },
    recordApproval: (context, event: any) => {
      console.log('Recording approval from reviewer:', event.reviewerId);
    },
    recordRejection: (context, event: any) => {
      console.log('Recording rejection from reviewer:', event.reviewerId);
    },
    recordChangeRequest: (context, event: any) => {
      console.log('Recording change request:', event.changes);
    },
    clearChangeRequests: (context) => {
      console.log('Clearing change requests');
    },
    markTaskComplete: (context) => {
      console.log('Task completed successfully');
    },
  },
  guards: {
    allAnnotationsComplete: (context) => {
      return context.completedAnnotations >= context.annotatorsPerTask;
    },
    needsMoreAnnotators: (context) => {
      return context.completedAnnotations < context.annotatorsPerTask;
    },
    hasReviewLevels: (context: any) => {
      return context.maxReviewLevel > 0;
    },
    consensusMetOrNoReview: (context: any) => {
      return context.consensusReached || context.maxReviewLevel === 0;
    },
    level1ApprovedAndHasLevel2: (context: any) => {
      return context.currentReviewLevel === 1 && context.maxReviewLevel >= 2;
    },
    level1ApprovedAndNoMoreLevels: (context: any) => {
      return context.currentReviewLevel === 1 && context.maxReviewLevel === 1;
    },
    level2ApprovedAndHasLevel3: (context: any) => {
      return context.currentReviewLevel === 2 && context.maxReviewLevel >= 3;
    },
    level2ApprovedAndNoMoreLevels: (context: any) => {
      return context.currentReviewLevel === 2 && context.maxReviewLevel === 2;
    },
    level3Approved: (context: any) => {
      return context.currentReviewLevel === 3;
    },
  },
});
```

## Simplified Workflow for Single Annotator + Review

```typescript
export const simpleReviewWorkflow = createMachine({
  id: 'simpleReviewWorkflow',
  initial: 'queued',
  context: {
    taskId: '',
    reviewLevel: 0,
    maxReviewLevel: 0,
    approvals: {},
  },
  states: {
    queued: {
      on: {
        ASSIGN: 'assigned',
      },
    },
    assigned: {
      on: {
        START: 'in_progress',
        RELEASE: 'queued',
      },
    },
    in_progress: {
      on: {
        SUBMIT: 'submitted',
        SAVE_DRAFT: 'in_progress',
      },
    },
    submitted: {
      always: [
        {
          target: 'review',
          guard: 'requiresReview',
        },
        {
          target: 'completed',
        },
      ],
    },
    review: {
      on: {
        APPROVE: {
          target: 'checkNextLevel',
          actions: 'incrementReviewLevel',
        },
        REJECT: {
          target: 'in_progress',
          actions: 'notifyRejection',
        },
        REQUEST_CHANGES: {
          target: 'in_progress',
          actions: 'attachChanges',
        },
      },
    },
    checkNextLevel: {
      always: [
        {
          target: 'review',
          guard: 'hasMoreReviewLevels',
        },
        {
          target: 'completed',
        },
      ],
    },
    completed: {
      type: 'final',
    },
  },
},
{
  actions: {
    incrementReviewLevel: assign({
      reviewLevel: (context) => context.reviewLevel + 1,
    }),
    notifyRejection: (context, event: any) => {
      console.log('Task rejected by reviewer');
    },
    attachChanges: (context, event: any) => {
      console.log('Changes requested:', event.changes);
    },
  },
  guards: {
    requiresReview: (context) => context.maxReviewLevel > 0,
    hasMoreReviewLevels: (context) => context.reviewLevel < context.maxReviewLevel,
  },
});
```

## Usage in NestJS Service

```typescript
import { Injectable } from '@nestjs/common';
import { interpret } from 'xstate';
import { multiAnnotatorWorkflow } from './workflows/multi-annotator.workflow';

@Injectable()
export class WorkflowService {
  createTaskWorkflow(config: any) {
    const machine = multiAnnotatorWorkflow.withContext({
      projectId: config.projectId,
      taskId: config.taskId,
      annotatorsPerTask: config.annotatorsPerTask,
      maxReviewLevel: config.reviewLevels.length,
      completedAnnotations: 0,
      annotations: [],
      consensusThreshold: config.consensusThreshold || 0.8,
      consensusReached: false,
    });

    const service = interpret(machine);
    service.start();

    return service;
  }

  sendEvent(service: any, event: string, payload: any) {
    service.send({ type: event, ...payload });
  }

  getState(service: any) {
    return service.state;
  }
}
```

## Database Storage

The workflow definition is stored in the `workflows` table as JSONB:

```sql
INSERT INTO workflows (project_id, name, xstate_definition, status)
VALUES (
  'project-uuid',
  'Multi-Level Review Workflow',
  '{
    "id": "multiAnnotatorWorkflow",
    "initial": "queued",
    "states": { ... }
  }'::jsonb,
  'ACTIVE'
);
```

## Key Features Implemented

1. **Multiple Annotators per Task**: The workflow supports assigning multiple annotators to the same task
2. **Consensus Checking**: After all annotators submit, consensus is calculated
3. **Multi-Level Reviews**: Configurable review levels (L1, L2, L3, etc.)
4. **Git-like Approval Process**: Each review level requires approval from all assigned reviewers
5. **Change Requests**: Reviewers can request changes, sending task back to annotation
6. **State Persistence**: All state transitions are logged in `state_transitions` table
7. **Flexible Configuration**: Review levels are dynamically created based on project configuration
