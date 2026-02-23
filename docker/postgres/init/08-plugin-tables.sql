-- =============================================================================
-- Plugin Management Tables
-- plugin_secrets: AES-256-GCM encrypted API keys per project
-- plugin_execution_logs: audit trail per plugin run
-- =============================================================================

\c welo_platform;

-- Plugin secrets vault (AES-256 encrypted values)
CREATE TABLE IF NOT EXISTS plugin_secrets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,        -- reference key e.g. "OPENAI_API_KEY"
  encrypted_value TEXT NOT NULL,                -- server-side AES-256-GCM encrypted
  iv              VARCHAR(32) NOT NULL,          -- GCM initialization vector (hex)
  auth_tag        VARCHAR(32) NOT NULL,          -- GCM authentication tag (hex)
  description     TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, name)
);

-- Plugin execution audit log (answer_value intentionally NOT logged for data privacy)
CREATE TABLE IF NOT EXISTS plugin_execution_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id         VARCHAR(255) NOT NULL,
  project_id        UUID NOT NULL,
  task_id           UUID,
  question_id       VARCHAR(255),
  result            VARCHAR(20),               -- PASS | WARN | FAIL | ERROR | TIMEOUT
  message           TEXT,
  execution_time_ms INT,
  http_status       INT,                       -- API plugins only
  error_detail      TEXT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_plugin_secrets_project
  ON plugin_secrets(project_id);

CREATE INDEX IF NOT EXISTS idx_plugin_logs_project
  ON plugin_execution_logs(project_id);

CREATE INDEX IF NOT EXISTS idx_plugin_logs_task
  ON plugin_execution_logs(task_id);

CREATE INDEX IF NOT EXISTS idx_plugin_logs_plugin
  ON plugin_execution_logs(plugin_id);

CREATE INDEX IF NOT EXISTS idx_plugin_logs_result
  ON plugin_execution_logs(result);

CREATE INDEX IF NOT EXISTS idx_plugin_logs_created_at
  ON plugin_execution_logs(created_at DESC);
