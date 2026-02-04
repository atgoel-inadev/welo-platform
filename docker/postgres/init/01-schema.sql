-- Welo Platform Database Initialization Script
-- Creates all tables for the data annotation platform

\c welo_platform;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    billing_info JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    skills JSONB,
    performance_metrics JSONB,
    availability JSONB,
    last_login_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    default_workflow_id UUID,
    configuration JSONB NOT NULL,
    created_by UUID NOT NULL,
    start_date DATE,
    end_date DATE,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_customer_id ON projects(customer_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- =============================================================================
-- WORKFLOW TABLES (XState Integration)
-- =============================================================================

-- Workflows Table
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    xstate_definition JSONB NOT NULL,
    state_schema JSONB,
    event_schema JSONB,
    visualization_config JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    parent_workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
    created_by UUID NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflows_project_id ON workflows(project_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_version ON workflows(version);
CREATE INDEX idx_workflows_is_template ON workflows(is_template);

-- Workflow Instances Table
CREATE TABLE IF NOT EXISTS workflow_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    batch_id UUID,
    name VARCHAR(255) NOT NULL,
    actor_state JSONB NOT NULL,
    parent_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
    actor_type VARCHAR(50) NOT NULL,
    actor_ref_id VARCHAR(255),
    parallel_states JSONB,
    snapshot JSONB,
    checkpoint_at TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'RUNNING',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error JSONB,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_instances_workflow_id ON workflow_instances(workflow_id);
CREATE INDEX idx_workflow_instances_batch_id ON workflow_instances(batch_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX idx_workflow_instances_actor_type ON workflow_instances(actor_type);
CREATE INDEX idx_workflow_instances_parent_instance_id ON workflow_instances(parent_instance_id);

-- State Transitions Table
CREATE TABLE IF NOT EXISTS state_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
    event JSONB NOT NULL,
    from_state JSONB NOT NULL,
    to_state JSONB NOT NULL,
    transition_type VARCHAR(50) NOT NULL,
    guards_evaluated JSONB,
    actions_executed JSONB,
    user_id UUID,
    triggered_by VARCHAR(50) NOT NULL,
    duration INTEGER,
    is_automatic BOOLEAN NOT NULL DEFAULT FALSE,
    error JSONB,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_state_transitions_entity_type ON state_transitions(entity_type);
CREATE INDEX idx_state_transitions_entity_id ON state_transitions(entity_id);
CREATE INDEX idx_state_transitions_workflow_id ON state_transitions(workflow_id);
CREATE INDEX idx_state_transitions_created_at ON state_transitions(created_at);
CREATE INDEX idx_state_transitions_user_id ON state_transitions(user_id);
CREATE INDEX idx_state_transitions_composite ON state_transitions(entity_type, entity_id, created_at);

-- =============================================================================
-- TASK MANAGEMENT TABLES
-- =============================================================================

-- Batches Table
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'CREATED',
    priority INTEGER NOT NULL DEFAULT 5,
    total_tasks INTEGER NOT NULL DEFAULT 0,
    completed_tasks INTEGER NOT NULL DEFAULT 0,
    quality_score DECIMAL(5, 2),
    configuration JSONB,
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_batches_project_id ON batches(project_id);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_priority ON batches(priority);
CREATE INDEX idx_batches_due_date ON batches(due_date);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE RESTRICT,
    external_id VARCHAR(255) NOT NULL,
    task_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
    priority INTEGER NOT NULL DEFAULT 5,
    machine_state JSONB NOT NULL,
    previous_state JSONB,
    state_updated_at TIMESTAMP,
    data_payload JSONB NOT NULL,
    assignment_id UUID,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    assigned_at TIMESTAMP,
    started_at TIMESTAMP,
    submitted_at TIMESTAMP,
    due_date TIMESTAMP,
    estimated_duration INTEGER,
    actual_duration INTEGER,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_batch_id ON tasks(batch_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_workflow_id ON tasks(workflow_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_assigned_at ON tasks(assigned_at);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_state_updated_at ON tasks(state_updated_at);
CREATE INDEX idx_tasks_composite ON tasks(project_id, status, priority);

-- Assignments Table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workflow_stage VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED',
    assigned_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP,
    assignment_method VARCHAR(50) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assignments_task_id ON assignments(task_id);
CREATE INDEX idx_assignments_user_id ON assignments(user_id);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_assignments_assigned_at ON assignments(assigned_at);
CREATE INDEX idx_assignments_composite ON assignments(user_id, status, assigned_at);

-- Queues Table
CREATE TABLE IF NOT EXISTS queues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    queue_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    priority_rules JSONB,
    assignment_rules JSONB,
    total_tasks INTEGER NOT NULL DEFAULT 0,
    pending_tasks INTEGER NOT NULL DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_queues_project_id ON queues(project_id);
CREATE INDEX idx_queues_queue_type ON queues(queue_type);
CREATE INDEX idx_queues_status ON queues(status);

-- =============================================================================
-- ANNOTATION TABLES
-- =============================================================================

-- Annotations Table
CREATE TABLE IF NOT EXISTS annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    annotation_data JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_final BOOLEAN NOT NULL DEFAULT FALSE,
    confidence_score DECIMAL(3, 2),
    time_spent INTEGER,
    tool_version VARCHAR(50),
    submitted_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_annotations_task_id ON annotations(task_id);
CREATE INDEX idx_annotations_user_id ON annotations(user_id);
CREATE INDEX idx_annotations_submitted_at ON annotations(submitted_at);
CREATE INDEX idx_annotations_is_final ON annotations(is_final);
CREATE INDEX idx_annotations_composite ON annotations(task_id, version);

-- Quality Checks Table
CREATE TABLE IF NOT EXISTS quality_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    check_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    quality_score DECIMAL(5, 2),
    issues JSONB,
    feedback TEXT,
    corrected_annotation_id UUID REFERENCES annotations(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quality_checks_task_id ON quality_checks(task_id);
CREATE INDEX idx_quality_checks_annotation_id ON quality_checks(annotation_id);
CREATE INDEX idx_quality_checks_reviewer_id ON quality_checks(reviewer_id);
CREATE INDEX idx_quality_checks_check_type ON quality_checks(check_type);
CREATE INDEX idx_quality_checks_status ON quality_checks(status);

-- =============================================================================
-- OPERATIONAL TABLES
-- =============================================================================

-- Exports Table
CREATE TABLE IF NOT EXISTS exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    export_type VARCHAR(50) NOT NULL,
    format VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    file_url TEXT,
    file_size BIGINT,
    record_count INTEGER,
    filter_criteria JSONB,
    configuration JSONB,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exports_batch_id ON exports(batch_id);
CREATE INDEX idx_exports_project_id ON exports(project_id);
CREATE INDEX idx_exports_status ON exports(status);
CREATE INDEX idx_exports_created_at ON exports(created_at);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    changes JSONB,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_composite ON audit_logs(entity_type, entity_id, timestamp);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,
    expires_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Comments Table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachments JSONB,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Templates Table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    template_type VARCHAR(50) NOT NULL,
    content JSONB NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints that depend on tables created later
ALTER TABLE projects ADD CONSTRAINT fk_projects_default_workflow 
    FOREIGN KEY (default_workflow_id) REFERENCES workflows(id) ON DELETE SET NULL;

ALTER TABLE workflow_instances ADD CONSTRAINT fk_workflow_instances_batch 
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE;

ALTER TABLE tasks ADD CONSTRAINT fk_tasks_assignment 
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE SET NULL;

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to all tables
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_instances_updated_at BEFORE UPDATE ON workflow_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_state_transitions_updated_at BEFORE UPDATE ON state_transitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_queues_updated_at BEFORE UPDATE ON queues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_annotations_updated_at BEFORE UPDATE ON annotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quality_checks_updated_at BEFORE UPDATE ON quality_checks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exports_updated_at BEFORE UPDATE ON exports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_audit_logs_updated_at BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =============================================================================
-- ADDITIONAL TABLES FOR PROJECT MANAGEMENT ENHANCEMENTS
-- =============================================================================

-- Add new columns to tasks table (if not exists)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS file_type VARCHAR(50);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS file_metadata JSONB;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS requires_consensus BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS consensus_reached BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS consensus_score NUMERIC(5,2);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS current_review_level INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS max_review_level INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS all_reviews_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS total_assignments_required INTEGER DEFAULT 1;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_assignments INTEGER DEFAULT 0;

-- Add new columns to assignments table (if not exists)
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS assignment_order INTEGER DEFAULT 1;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS requires_consensus BOOLEAN DEFAULT FALSE;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS consensus_group_id UUID;

-- Review Approvals Table (Git-like review system)
CREATE TABLE IF NOT EXISTS review_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    review_level INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    comments TEXT,
    feedback JSONB,
    reviewed_at TIMESTAMP,
    requested_changes JSONB,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_review_approvals_task_id ON review_approvals(task_id);
CREATE INDEX idx_review_approvals_reviewer_id ON review_approvals(reviewer_id);
CREATE INDEX idx_review_approvals_assignment_id ON review_approvals(assignment_id);
CREATE INDEX idx_review_approvals_review_level ON review_approvals(review_level);
CREATE INDEX idx_review_approvals_status ON review_approvals(status);
CREATE INDEX idx_review_approvals_composite ON review_approvals(task_id, review_level, status);

-- Annotation Responses Table (for question-based annotations)
CREATE TABLE IF NOT EXISTS annotation_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    question_id VARCHAR(255) NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    response JSONB NOT NULL,
    time_spent INTEGER,
    confidence_score NUMERIC(5,2),
    is_skipped BOOLEAN DEFAULT FALSE,
    skip_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_annotation_responses_task_id ON annotation_responses(task_id);
CREATE INDEX idx_annotation_responses_annotation_id ON annotation_responses(annotation_id);
CREATE INDEX idx_annotation_responses_assignment_id ON annotation_responses(assignment_id);
CREATE INDEX idx_annotation_responses_question_id ON annotation_responses(question_id);

-- Add triggers for new tables
CREATE TRIGGER update_review_approvals_updated_at BEFORE UPDATE ON review_approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_annotation_responses_updated_at BEFORE UPDATE ON annotation_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();