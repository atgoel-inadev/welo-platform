-- =============================================================================
-- Add deleted_at column to tables missing it (for soft delete support)
-- BaseEntity has @DeleteDateColumn which requires this column
-- =============================================================================

\c welo_platform;

-- Add deleted_at column to all tables that extend BaseEntity but are missing it
ALTER TABLE workflow_instances
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE state_transitions
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE annotations
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE exports
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE templates
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE review_approvals
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE annotation_responses
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE gold_tasks
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE annotation_versions
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE quality_rules
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create indexes on deleted_at columns for better soft delete query performance
CREATE INDEX IF NOT EXISTS idx_workflow_instances_deleted_at 
    ON workflow_instances(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_state_transitions_deleted_at 
    ON state_transitions(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_annotations_deleted_at 
    ON annotations(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_exports_deleted_at 
    ON exports(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_deleted_at 
    ON audit_logs(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at 
    ON notifications(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_comments_deleted_at 
    ON comments(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_templates_deleted_at 
    ON templates(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_review_approvals_deleted_at 
    ON review_approvals(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_annotation_responses_deleted_at 
    ON annotation_responses(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_gold_tasks_deleted_at 
    ON gold_tasks(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_annotation_versions_deleted_at 
    ON annotation_versions(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_quality_rules_deleted_at 
    ON quality_rules(deleted_at) WHERE deleted_at IS NULL;
