-- =============================================================================
-- Project Team Members Table
-- Links users to projects with their role and quotas
-- =============================================================================

\c welo_platform;

CREATE TABLE IF NOT EXISTS project_team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    metadata JSONB,
    
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    quota INT,
    assigned_tasks_count INT NOT NULL DEFAULT 0,
    completed_tasks_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_project_user UNIQUE (project_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_team_members_project_id ON project_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_members_user_id ON project_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_team_members_role ON project_team_members(role);
CREATE INDEX IF NOT EXISTS idx_project_team_members_is_active ON project_team_members(is_active);

SELECT '✓ Project team members table created' AS info;
