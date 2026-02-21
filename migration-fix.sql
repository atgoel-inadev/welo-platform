-- Add missing columns to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS annotation_responses JSONB,
ADD COLUMN IF NOT EXISTS extra_widget_data JSONB,
ADD COLUMN IF NOT EXISTS review_data JSONB;

-- Create project_team_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS project_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL,
    quota INTEGER,
    assigned_tasks_count INTEGER DEFAULT 0,
    completed_tasks_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT project_team_members_unique UNIQUE (project_id, user_id),
    CONSTRAINT fk_project_team_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_project_team_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes on project_team_members
CREATE INDEX IF NOT EXISTS idx_project_team_project ON project_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_user ON project_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_team_role ON project_team_members(role);
