-- =============================================================================
-- Migration 001: Performance Indexes for Scale
-- Apply with: psql -d welo_platform -f 001_performance_indexes.sql
-- Safe to run multiple times (all use IF NOT EXISTS / CREATE INDEX CONCURRENTLY)
-- Run CONCURRENTLY in production to avoid locking tables during index builds.
-- =============================================================================

-- ─── TASKS ───────────────────────────────────────────────────────────────────

-- Partial index for the task-claim hot path (only indexes QUEUED tasks).
-- Used by getNextTask / pullNextTask SELECT FOR UPDATE SKIP LOCKED.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_claim
  ON tasks (project_id, priority DESC, created_at ASC)
  WHERE status = 'QUEUED';

-- Composite index covering the (projectId, status, priority) filter used
-- in list/filter endpoints. Already declared in the entity but added here
-- for explicit production management.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_project_status_priority
  ON tasks (project_id, status, priority DESC);

-- Stage-based assignment query: filters by project + machineState->currentStage.
-- GIN index on machine_state enables the JSON operator queries in
-- getNextTaskForStage and byState endpoints.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_machine_state_gin
  ON tasks USING GIN (machine_state);

-- GIN index for annotation_responses JSONB (denormalized fast-access column).
-- Enables queries like annotation_responses @> '[{"questionId":"q1"}]'.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_annotation_responses_gin
  ON tasks USING GIN (annotation_responses);

-- Covering index for assignment expiry background job.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assigned_at
  ON tasks (assigned_at)
  WHERE status = 'ASSIGNED';

-- ─── ASSIGNMENTS ─────────────────────────────────────────────────────────────

-- Hot path: check whether a user already has an active assignment for a task.
-- Used in getNextTaskForStage and assignment validation.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_task_user_status
  ON assignments (task_id, user_id, status);

-- Used in assignment expiry job: find all ASSIGNED rows past their expires_at.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_expiry
  ON assignments (expires_at)
  WHERE status = 'ASSIGNED' AND expires_at IS NOT NULL;

-- Stage-specific assignment count subquery in getNextTaskForStage.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_task_stage_status
  ON assignments (task_id, stage_id, status);

-- ─── ANNOTATIONS ─────────────────────────────────────────────────────────────

-- GIN index for annotation_data JSONB — enables label/span searches.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_annotations_data_gin
  ON annotations USING GIN (annotation_data);

-- Used in QA service queries joining annotations to tasks by project.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_annotations_task_is_final
  ON annotations (task_id, is_final, submitted_at DESC);

-- ─── ANNOTATION RESPONSES ────────────────────────────────────────────────────

-- Per-question response lookup (task + question).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_annotation_responses_task_question
  ON annotation_responses (task_id, question_id);

-- ─── REVIEW APPROVALS ────────────────────────────────────────────────────────

-- Composite for multi-level review queries: task + level + status.
-- Already on the entity; listed here for explicit production management.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_approvals_task_level_status
  ON review_approvals (task_id, review_level, status);

-- ─── STATE TRANSITIONS ───────────────────────────────────────────────────────

-- Primary audit query: all transitions for an entity ordered by time.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_state_transitions_entity_time
  ON state_transitions (entity_type, entity_id, created_at DESC);

-- Workflow-scoped transition analytics queries.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_state_transitions_workflow_time
  ON state_transitions (workflow_id, created_at DESC);

-- ─── QUALITY CHECKS ──────────────────────────────────────────────────────────

-- Project-level QC metrics query in getProjectMetrics (avoids correlated subquery).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quality_checks_task_type_status
  ON quality_checks (task_id, check_type, status);

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

-- Unread notification fetch per user (most common query).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, created_at DESC)
  WHERE is_read = false;

-- ─── AUDIT LOGS ──────────────────────────────────────────────────────────────

-- Time-range audit queries per entity.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity_time
  ON audit_logs (entity_type, entity_id, timestamp DESC);

-- ─── PLUGIN EXECUTION LOGS ───────────────────────────────────────────────────

-- Recent logs per project (90-day rolling retention).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_plugin_logs_project_time
  ON plugin_execution_logs (project_id, executed_at DESC);

-- =============================================================================
-- TABLE PARTITIONING (run manually / via migration tool in production)
-- These cannot be applied CONCURRENTLY to existing tables. Recommended approach:
--   1. Rename original table to _old
--   2. Create partitioned table with same schema
--   3. Attach _old as a partition or copy data in batches
--   4. Swap application traffic
-- =============================================================================

-- ─── state_transitions: daily partitions ─────────────────────────────────────
-- At scale (10K tasks × ~10 transitions), this table hits 100K+ rows/day.
-- Partitioned by created_at (daily) to allow cheap partition drops for retention.
--
-- Example (create future partitions each month via cron):
--
-- CREATE TABLE state_transitions_2026_03 PARTITION OF state_transitions
--   FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
--
-- CREATE TABLE state_transitions_2026_04 PARTITION OF state_transitions
--   FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- ─── audit_logs: weekly partitions ───────────────────────────────────────────
-- 7-year retention with weekly partitions gives ~364 manageable partition files.
--
-- CREATE TABLE audit_logs_2026_w10 PARTITION OF audit_logs
--   FOR VALUES FROM ('2026-03-02') TO ('2026-03-09');

-- ─── plugin_execution_logs: monthly partitions ───────────────────────────────
-- 90-day TTL: drop partitions older than 3 months.
--
-- CREATE TABLE plugin_execution_logs_2026_03 PARTITION OF plugin_execution_logs
--   FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
--
-- To retire a partition (after 90 days):
--   DROP TABLE plugin_execution_logs_2025_12;

-- =============================================================================
-- READ REPLICA ROUTING HINT
-- Route the following query patterns to the read replica (DB_READ_HOST):
--   - GET /projects/:id/statistics
--   - GET /batches/:id/statistics
--   - GET /quality-checks/project/:id/metrics
--   - GET /tasks/time-analytics
--   - GET /state-transitions (audit log reads)
--   - GET /audit-logs
-- Configure via TypeORM replication option or per-query DataSource selection.
-- =============================================================================
