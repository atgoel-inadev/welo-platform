-- Welo Platform Database Seed Data
-- Inserts sample data for development and testing

\c welo_platform;

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Insert Sample Customers
INSERT INTO customers (id, name, organization, contact_email, contact_phone, status, metadata) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Acme Corporation', 'Acme Corp', 'contact@acme.com', '+1-555-0100', 'ACTIVE', '{"industry": "Technology", "size": "Enterprise"}'),
('550e8400-e29b-41d4-a716-446655440002', 'Global Data Inc', 'Global Data', 'info@globaldata.com', '+1-555-0200', 'ACTIVE', '{"industry": "Data Services", "size": "Large"}'),
('550e8400-e29b-41d4-a716-446655440003', 'Research Labs', 'Research Labs Ltd', 'contact@researchlabs.com', '+1-555-0300', 'ACTIVE', '{"industry": "Research", "size": "Medium"}');

-- Insert Sample Users
INSERT INTO users (id, email, username, first_name, last_name, role, status, skills, performance_metrics, availability) VALUES
-- Admins
('650e8400-e29b-41d4-a716-446655440001', 'admin@welo.com', 'admin', 'System', 'Administrator', 'ADMIN', 'ACTIVE', 
 '[]'::jsonb,
 '{"tasksCompleted": 0, "averageQuality": 0, "averageSpeed": 0, "accuracyRate": 0}'::jsonb,
 '{"timezone": "UTC", "workingHours": {}, "capacity": 100}'::jsonb),

-- Project Managers
('650e8400-e29b-41d4-a716-446655440002', 'pm1@welo.com', 'pm_alice', 'Alice', 'Johnson', 'PROJECT_MANAGER', 'ACTIVE',
 '[{"skillName": "Project Management", "proficiency": "EXPERT"}]'::jsonb,
 '{"tasksCompleted": 45, "averageQuality": 95.5, "averageSpeed": 88.0, "accuracyRate": 96.2}'::jsonb,
 '{"timezone": "America/New_York", "workingHours": {"monday": "9-17"}, "capacity": 100}'::jsonb),

-- Annotators
('650e8400-e29b-41d4-a716-446655440003', 'annotator1@welo.com', 'ann_bob', 'Bob', 'Smith', 'ANNOTATOR', 'ACTIVE',
 '[{"skillName": "Text Annotation", "proficiency": "EXPERT"}, {"skillName": "Image Labeling", "proficiency": "ADVANCED"}]'::jsonb,
 '{"tasksCompleted": 523, "averageQuality": 92.3, "averageSpeed": 85.5, "accuracyRate": 94.1}'::jsonb,
 '{"timezone": "America/Los_Angeles", "workingHours": {"monday": "9-17", "tuesday": "9-17"}, "capacity": 50}'::jsonb),

('650e8400-e29b-41d4-a716-446655440004', 'annotator2@welo.com', 'ann_carol', 'Carol', 'Davis', 'ANNOTATOR', 'ACTIVE',
 '[{"skillName": "Video Annotation", "proficiency": "ADVANCED"}, {"skillName": "Audio Transcription", "proficiency": "EXPERT"}]'::jsonb,
 '{"tasksCompleted": 412, "averageQuality": 89.7, "averageSpeed": 82.3, "accuracyRate": 91.5}'::jsonb,
 '{"timezone": "Europe/London", "workingHours": {"monday": "8-16", "tuesday": "8-16"}, "capacity": 60}'::jsonb),

-- Reviewers
('650e8400-e29b-41d4-a716-446655440005', 'reviewer1@welo.com', 'rev_david', 'David', 'Wilson', 'REVIEWER', 'ACTIVE',
 '[{"skillName": "Quality Review", "proficiency": "EXPERT"}, {"skillName": "Text Annotation", "proficiency": "EXPERT"}]'::jsonb,
 '{"tasksCompleted": 234, "averageQuality": 97.8, "averageSpeed": 78.5, "accuracyRate": 98.2}'::jsonb,
 '{"timezone": "America/Chicago", "workingHours": {"monday": "10-18"}, "capacity": 40}'::jsonb),

-- QA
('650e8400-e29b-41d4-a716-446655440006', 'qa1@welo.com', 'qa_emily', 'Emily', 'Brown', 'QA', 'ACTIVE',
 '[{"skillName": "Quality Assurance", "proficiency": "EXPERT"}, {"skillName": "Process Auditing", "proficiency": "ADVANCED"}]'::jsonb,
 '{"tasksCompleted": 156, "averageQuality": 99.1, "averageSpeed": 72.3, "accuracyRate": 99.5}'::jsonb,
 '{"timezone": "America/New_York", "workingHours": {"monday": "9-17"}, "capacity": 30}'::jsonb);

-- Insert Sample Workflows
INSERT INTO workflows (id, name, description, version, xstate_definition, status, is_template, created_by) VALUES
('750e8400-e29b-41d4-a716-446655440001', 'Simple Annotation Workflow', 'Basic annotation workflow with review', 1,
 '{
   "id": "simple-annotation",
   "initial": "pending",
   "context": {},
   "states": {
     "pending": {
       "on": {
         "ASSIGN": "assigned"
       }
     },
     "assigned": {
       "on": {
         "START": "in_progress",
         "SKIP": "skipped"
       }
     },
     "in_progress": {
       "on": {
         "SUBMIT": "submitted"
       }
     },
     "submitted": {
       "on": {
         "APPROVE": "approved",
         "REJECT": "rejected"
       }
     },
     "approved": {
       "type": "final"
     },
     "rejected": {
       "on": {
         "REASSIGN": "assigned"
       }
     },
     "skipped": {
       "type": "final"
     }
   }
 }'::jsonb,
 'ACTIVE', TRUE, '650e8400-e29b-41d4-a716-446655440001'),

('750e8400-e29b-41d4-a716-446655440002', 'Multi-Stage Review Workflow', 'Annotation with dual review process', 1,
 '{
   "id": "multi-stage-review",
   "initial": "pending",
   "context": {"reviewCount": 0},
   "states": {
     "pending": {
       "on": {
         "ASSIGN": "annotating"
       }
     },
     "annotating": {
       "on": {
         "SUBMIT": "first_review"
       }
     },
     "first_review": {
       "on": {
         "APPROVE": "second_review",
         "REJECT": "annotating"
       }
     },
     "second_review": {
       "on": {
         "APPROVE": "approved",
         "REJECT": "annotating"
       }
     },
     "approved": {
       "type": "final"
     }
   }
 }'::jsonb,
 'ACTIVE', TRUE, '650e8400-e29b-41d4-a716-446655440001');

-- Insert Sample Projects
INSERT INTO projects (id, customer_id, name, description, project_type, status, default_workflow_id, configuration, created_by, start_date, end_date) VALUES
('850e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Sentiment Analysis Dataset', 'Annotate customer reviews for sentiment', 'TEXT', 'ACTIVE', '750e8400-e29b-41d4-a716-446655440001',
 '{
   "annotationSchema": {
     "type": "classification",
     "labels": ["positive", "negative", "neutral"]
   },
   "qualityThresholds": {
     "minimumAccuracy": 0.85,
     "agreementThreshold": 0.9
   },
   "workflowRules": {},
   "uiConfiguration": {
     "theme": "light",
     "showConfidence": true
   }
 }'::jsonb,
 '650e8400-e29b-41d4-a716-446655440002', '2026-01-01', '2026-06-30'),

('850e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Image Classification Project', 'Classify images into categories', 'IMAGE', 'ACTIVE', '750e8400-e29b-41d4-a716-446655440002',
 '{
   "annotationSchema": {
     "type": "multi-label",
     "categories": ["vehicle", "person", "animal", "building", "nature"]
   },
   "qualityThresholds": {
     "minimumAccuracy": 0.9,
     "agreementThreshold": 0.95
   },
   "workflowRules": {},
   "uiConfiguration": {
     "theme": "dark",
     "showConfidence": true
   }
 }'::jsonb,
 '650e8400-e29b-41d4-a716-446655440002', '2026-02-01', '2026-08-31');

-- Insert Sample Batches
INSERT INTO batches (id, project_id, name, description, status, priority, total_tasks, completed_tasks, quality_score, due_date) VALUES
('950e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440001', 'Batch 1 - Customer Reviews', 'First batch of 100 customer reviews', 'IN_PROGRESS', 8, 100, 35, 91.5, '2026-03-15'),
('950e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440001', 'Batch 2 - Product Reviews', 'Second batch of 150 product reviews', 'CREATED', 5, 150, 0, NULL, '2026-04-01'),
('950e8400-e29b-41d4-a716-446655440003', '850e8400-e29b-41d4-a716-446655440002', 'Image Batch 1', 'First batch of vehicle images', 'IN_PROGRESS', 7, 200, 87, 93.2, '2026-03-20');

-- Insert Sample Tasks
INSERT INTO tasks (id, batch_id, project_id, workflow_id, external_id, task_type, status, priority, machine_state, data_payload, attempt_count) VALUES
-- Batch 1 tasks
('a50e8400-e29b-41d4-a716-446655440001', '950e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 'TASK-001', 'ANNOTATION', 'IN_PROGRESS', 5,
 '{"value": "in_progress", "context": {"startTime": "2026-02-03T10:00:00Z"}, "done": false, "changed": true, "tags": []}'::jsonb,
 '{"sourceData": {"text": "This product exceeded my expectations! Great quality."}, "references": [], "context": {}}'::jsonb,
 1),

('a50e8400-e29b-41d4-a716-446655440002', '950e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 'TASK-002', 'ANNOTATION', 'SUBMITTED', 5,
 '{"value": "submitted", "context": {"startTime": "2026-02-03T09:00:00Z", "endTime": "2026-02-03T09:15:00Z"}, "done": false, "changed": true, "tags": []}'::jsonb,
 '{"sourceData": {"text": "Terrible experience, would not recommend."}, "references": [], "context": {}}'::jsonb,
 1),

('a50e8400-e29b-41d4-a716-446655440003', '950e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 'TASK-003', 'ANNOTATION', 'APPROVED', 5,
 '{"value": "approved", "context": {"startTime": "2026-02-02T14:00:00Z", "endTime": "2026-02-02T14:20:00Z"}, "done": true, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"text": "Good value for money, but shipping was slow."}, "references": [], "context": {}}'::jsonb,
 1),

('a50e8400-e29b-41d4-a716-446655440004', '950e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 'TASK-004', 'ANNOTATION', 'QUEUED', 8,
 '{"value": "pending", "context": {}, "done": false, "changed": false, "tags": []}'::jsonb,
 '{"sourceData": {"text": "Average product, nothing special."}, "references": [], "context": {}}'::jsonb,
 0);

-- Insert Sample Queues
INSERT INTO queues (id, project_id, name, queue_type, status, priority_rules, assignment_rules, total_tasks, pending_tasks) VALUES
('b50e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440001', 'Annotation Queue', 'ANNOTATION', 'ACTIVE',
 '{"priorityField": "priority", "sortOrder": "DESC", "filters": []}'::jsonb,
 '{"autoAssign": true, "capacityLimits": {"perUser": 50}, "skillRequirements": ["Text Annotation"], "loadBalancing": {"strategy": "round-robin"}}'::jsonb,
 100, 65),

('b50e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440001', 'Review Queue', 'REVIEW', 'ACTIVE',
 '{"priorityField": "priority", "sortOrder": "DESC", "filters": []}'::jsonb,
 '{"autoAssign": true, "capacityLimits": {"perUser": 30}, "skillRequirements": ["Quality Review"], "loadBalancing": {"strategy": "least-busy"}}'::jsonb,
 35, 12);

-- Insert Sample Assignments
INSERT INTO assignments (id, task_id, user_id, workflow_stage, status, assigned_at, accepted_at, assignment_method) VALUES
('c50e8400-e29b-41d4-a716-446655440001', 'a50e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440003', 'ANNOTATION', 'IN_PROGRESS', '2026-02-03T10:00:00Z', '2026-02-03T10:05:00Z', 'AUTOMATIC'),
('c50e8400-e29b-41d4-a716-446655440002', 'a50e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440004', 'ANNOTATION', 'COMPLETED', '2026-02-03T09:00:00Z', '2026-02-03T09:02:00Z', 'AUTOMATIC'),
('c50e8400-e29b-41d4-a716-446655440003', 'a50e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440003', 'ANNOTATION', 'COMPLETED', '2026-02-02T14:00:00Z', '2026-02-02T14:01:00Z', 'AUTOMATIC');

-- Insert Sample Annotations
INSERT INTO annotations (id, task_id, assignment_id, user_id, annotation_data, version, is_final, confidence_score, time_spent, submitted_at) VALUES
('d50e8400-e29b-41d4-a716-446655440001', 'a50e8400-e29b-41d4-a716-446655440002', 'c50e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440004',
 '{"labels": ["negative"], "spans": [], "entities": [], "relationships": [], "attributes": {"sentiment": "negative", "intensity": "strong"}}'::jsonb,
 1, FALSE, 0.92, 900, '2026-02-03T09:15:00Z'),

('d50e8400-e29b-41d4-a716-446655440002', 'a50e8400-e29b-41d4-a716-446655440003', 'c50e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440003',
 '{"labels": ["neutral"], "spans": [], "entities": [], "relationships": [], "attributes": {"sentiment": "neutral", "intensity": "moderate"}}'::jsonb,
 1, TRUE, 0.87, 1200, '2026-02-02T14:20:00Z');

-- Insert Sample Quality Checks
INSERT INTO quality_checks (id, task_id, annotation_id, reviewer_id, check_type, status, quality_score, feedback) VALUES
('e50e8400-e29b-41d4-a716-446655440001', 'a50e8400-e29b-41d4-a716-446655440002', 'd50e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440005', 'MANUAL', 'PASS', 94.5, 'Good annotation, clear sentiment identification'),
('e50e8400-e29b-41d4-a716-446655440002', 'a50e8400-e29b-41d4-a716-446655440003', 'd50e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440005', 'MANUAL', 'PASS', 91.2, 'Acceptable annotation, minor improvements possible');

-- Insert Sample Templates
INSERT INTO templates (id, name, category, template_type, content, is_public, created_by, usage_count) VALUES
('f50e8400-e29b-41d4-a716-446655440001', 'Text Sentiment Schema', 'Annotation', 'ANNOTATION_SCHEMA',
 '{"type": "classification", "labels": ["positive", "negative", "neutral"], "attributes": ["intensity", "topics"]}'::jsonb,
 TRUE, '650e8400-e29b-41d4-a716-446655440001', 5),

('f50e8400-e29b-41d4-a716-446655440002', 'Image Labeling Schema', 'Annotation', 'ANNOTATION_SCHEMA',
 '{"type": "bounding-box", "classes": ["person", "vehicle", "object"], "attributes": ["occluded", "truncated"]}'::jsonb,
 TRUE, '650e8400-e29b-41d4-a716-446655440001', 3);

-- Insert Sample Notifications
INSERT INTO notifications (user_id, type, priority, title, message, is_read) VALUES
('650e8400-e29b-41d4-a716-446655440003', 'TASK_ASSIGNED', 'MEDIUM', 'New Task Assigned', 'You have been assigned a new annotation task: TASK-001', FALSE),
('650e8400-e29b-41d4-a716-446655440004', 'FEEDBACK_RECEIVED', 'LOW', 'Feedback on Task', 'Your annotation for TASK-002 received positive feedback', TRUE),
('650e8400-e29b-41d4-a716-446655440005', 'TASK_ASSIGNED', 'HIGH', 'Review Required', 'Task TASK-002 is ready for review', FALSE);

-- Insert Sample Comments
INSERT INTO comments (entity_type, entity_id, user_id, content, is_resolved) VALUES
('TASK', 'a50e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440005', 'Please verify the sentiment classification for this review', TRUE),
('ANNOTATION', 'd50e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440005', 'Good work on identifying the negative sentiment', FALSE);

-- Insert Sample Audit Logs
INSERT INTO audit_logs (entity_type, entity_id, action, user_id, ip_address, user_agent, changes) VALUES
('Project', '850e8400-e29b-41d4-a716-446655440001', 'CREATE', '650e8400-e29b-41d4-a716-446655440002', '192.168.1.100', 'Mozilla/5.0',
 '{"before": null, "after": {"name": "Sentiment Analysis Dataset", "status": "DRAFT"}}'::jsonb),

('Task', 'a50e8400-e29b-41d4-a716-446655440001', 'UPDATE', '650e8400-e29b-41d4-a716-446655440003', '192.168.1.101', 'Mozilla/5.0',
 '{"before": {"status": "ASSIGNED"}, "after": {"status": "IN_PROGRESS"}}'::jsonb),

('Annotation', 'd50e8400-e29b-41d4-a716-446655440001', 'CREATE', '650e8400-e29b-41d4-a716-446655440004', '192.168.1.102', 'Mozilla/5.0',
 '{"before": null, "after": {"labels": ["negative"]}}'::jsonb);

-- Display summary
SELECT 'Database seeded successfully!' AS status;
SELECT 'Customers: ' || COUNT(*) AS count FROM customers;
SELECT 'Users: ' || COUNT(*) AS count FROM users;
SELECT 'Projects: ' || COUNT(*) AS count FROM projects;
SELECT 'Workflows: ' || COUNT(*) AS count FROM workflows;
SELECT 'Batches: ' || COUNT(*) AS count FROM batches;
SELECT 'Tasks: ' || COUNT(*) AS count FROM tasks;
SELECT 'Annotations: ' || COUNT(*) AS count FROM annotations;
