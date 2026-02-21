-- =============================================================================
-- Time Tracking Improvements Migration
-- Adds time_spent to review_approvals and ensures annotations.time_spent exists
-- =============================================================================

\c welo_platform;

-- Add time_spent to review_approvals (seconds the reviewer spent on this review)
ALTER TABLE review_approvals
    ADD COLUMN IF NOT EXISTS time_spent INT;

-- Add an index on time_spent for analytics queries
CREATE INDEX IF NOT EXISTS idx_review_approvals_time_spent
    ON review_approvals(time_spent)
    WHERE time_spent IS NOT NULL;

-- Ensure annotations.time_spent column exists (created in base schema, but safe guard)
ALTER TABLE annotations
    ADD COLUMN IF NOT EXISTS time_spent INT;

CREATE INDEX IF NOT EXISTS idx_annotations_user_time
    ON annotations(user_id, time_spent)
    WHERE time_spent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_annotations_task_time
    ON annotations(task_id, time_spent)
    WHERE time_spent IS NOT NULL;
