-- =============================================================================
-- Annotation QA Service - Additional Tables
-- Extends the base schema with Gold Tasks, Annotation Versions, and Quality Rules
-- =============================================================================

\c welo_platform;

-- -----------------------------------------------------------------------------
-- Gold Tasks Table
-- Stores gold-standard (known-correct) reference annotations per task
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gold_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    gold_annotation JSONB NOT NULL,
    tolerance JSONB,
    created_by UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gold_tasks_task_id ON gold_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_gold_tasks_project_id ON gold_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_gold_tasks_is_active ON gold_tasks(is_active);

-- -----------------------------------------------------------------------------
-- Annotation Versions Table
-- Stores full version history snapshots of each annotation edit
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS annotation_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
    version INT NOT NULL,
    annotation_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2),
    changed_by UUID NOT NULL REFERENCES users(id),
    change_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_annotation_versions_annotation_id ON annotation_versions(annotation_id);
CREATE INDEX IF NOT EXISTS idx_annotation_versions_annotation_version ON annotation_versions(annotation_id, version);

-- -----------------------------------------------------------------------------
-- Quality Rules Table
-- Configurable quality validation rules scoped per project
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quality_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,   -- COMPLETENESS | FORMAT | CONFIDENCE_THRESHOLD | GOLD_MATCH | CUSTOM
    configuration JSONB NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'ERROR',  -- ERROR | WARNING
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    weight DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quality_rules_project_id ON quality_rules(project_id);
CREATE INDEX IF NOT EXISTS idx_quality_rules_project_active ON quality_rules(project_id, is_active);

-- -----------------------------------------------------------------------------
-- Triggers: auto-update updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_gold_tasks_updated_at') THEN
        CREATE TRIGGER update_gold_tasks_updated_at
            BEFORE UPDATE ON gold_tasks
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_annotation_versions_updated_at') THEN
        CREATE TRIGGER update_annotation_versions_updated_at
            BEFORE UPDATE ON annotation_versions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quality_rules_updated_at') THEN
        CREATE TRIGGER update_quality_rules_updated_at
            BEFORE UPDATE ON quality_rules
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$;
