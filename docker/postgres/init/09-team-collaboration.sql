-- =============================================================================
-- Welo Platform — Team Collaboration Setup (09)
-- =============================================================================
--
-- PURPOSE:
--   Idempotent supplement executed after files 01–08 on a fresh Docker Compose
--   startup. Reconciles the users table with mock-users.json (the auth-service
--   source of truth), adds sample plugin configurations so the Plugin feature
--   is visible immediately, and prints a credential summary for onboarding.
--
-- SAFE TO RE-RUN: Every write uses ON CONFLICT DO NOTHING or a WHERE guard
--   so running this file multiple times does not create duplicates or errors.
--
-- EXECUTION ORDER:
--   Docker Compose mounts docker/postgres/init/ and PostgreSQL runs all *.sql
--   files in alphabetical order (01, 02, … 09). This file MUST run last.
--
-- PREREQUISITES: Files 01–08 must have been applied first.
--
-- =============================================================================

\c welo_platform;

-- =============================================================================
-- SECTION 1 — RECONCILE USERS TABLE WITH mock-users.json
-- =============================================================================
-- The auth-service reads users from apps/auth-service/src/auth/mock-users.json.
-- File 02-seed.sql assigned ID 650e8400-…-446655440006 to qa1@welo.com (Emily,
-- role=QA), but mock-users.json maps that same ID to reviewer2@welo.com (Eve,
-- role=REVIEWER).  Without this fix, reviewer2 can authenticate but every
-- downstream service resolves them as Emily/QA, causing role mismatches.
--
-- Fix: update the row in-place only if it still holds the old qa1 values.
-- =============================================================================

UPDATE users
SET
  email               = 'reviewer2@welo.com',
  username            = 'rev_eve',
  first_name          = 'Eve',
  last_name           = 'Reviewer',
  role                = 'REVIEWER',
  skills              = '[
    {"skillName": "Quality Review",   "proficiency": "EXPERT"},
    {"skillName": "Text Annotation",  "proficiency": "ADVANCED"}
  ]'::jsonb,
  performance_metrics = '{"tasksCompleted": 189, "averageQuality": 96.3, "averageSpeed": 79.8, "accuracyRate": 97.1}'::jsonb,
  availability        = '{"timezone": "Europe/London", "workingHours": {"monday": "9-17", "tuesday": "9-17"}, "capacity": 40}'::jsonb
WHERE id    = '650e8400-e29b-41d4-a716-446655440006'
  AND email = 'qa1@welo.com';   -- guard: only patches when still the old row

-- =============================================================================
-- SECTION 2 — ENSURE ALL 23 MOCK USERS EXIST IN THE USERS TABLE
-- =============================================================================
-- This is a safety net. Files 02 and 06 seed all users; if for any reason a
-- row is missing (e.g., partial restore), these ON CONFLICT DO NOTHING inserts
-- fill the gap without breaking a complete database.
-- =============================================================================

-- Reviewer 2 (Eve) — may have been overwritten or dropped; ensure presence
INSERT INTO users (id, email, username, first_name, last_name, role, status, skills, performance_metrics, availability)
VALUES (
  '650e8400-e29b-41d4-a716-446655440006',
  'reviewer2@welo.com', 'rev_eve', 'Eve', 'Reviewer', 'REVIEWER', 'ACTIVE',
  '[{"skillName": "Quality Review", "proficiency": "EXPERT"}, {"skillName": "Text Annotation", "proficiency": "ADVANCED"}]'::jsonb,
  '{"tasksCompleted": 189, "averageQuality": 96.3, "averageSpeed": 79.8, "accuracyRate": 97.1}'::jsonb,
  '{"timezone": "Europe/London", "workingHours": {"monday": "9-17", "tuesday": "9-17"}, "capacity": 40}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Reviewer 3 — Tara (seeded in 06, guard included for safety)
INSERT INTO users (id, email, username, first_name, last_name, role, status, skills, performance_metrics, availability)
VALUES (
  '650e8400-e29b-41d4-a716-446655440021',
  'reviewer3@welo.com', 'rev_tara', 'Tara', 'Collins', 'REVIEWER', 'ACTIVE',
  '[{"skillName": "Quality Review", "proficiency": "EXPERT"}, {"skillName": "Audio Review", "proficiency": "ADVANCED"}]'::jsonb,
  '{"tasksCompleted": 145, "averageQuality": 97.2, "averageSpeed": 76.1, "accuracyRate": 97.9}'::jsonb,
  '{"timezone": "America/New_York", "workingHours": {"monday": "9-17", "wednesday": "9-17"}, "capacity": 35}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Reviewer 4 — Uma (seeded in 06, guard included for safety)
INSERT INTO users (id, email, username, first_name, last_name, role, status, skills, performance_metrics, availability)
VALUES (
  '650e8400-e29b-41d4-a716-446655440022',
  'reviewer4@welo.com', 'rev_uma', 'Uma', 'Patel', 'REVIEWER', 'ACTIVE',
  '[{"skillName": "Quality Review", "proficiency": "ADVANCED"}, {"skillName": "Image Review", "proficiency": "EXPERT"}]'::jsonb,
  '{"tasksCompleted": 167, "averageQuality": 95.8, "averageSpeed": 81.4, "accuracyRate": 96.5}'::jsonb,
  '{"timezone": "Asia/Kolkata", "workingHours": {"tuesday": "9-17", "thursday": "9-17"}, "capacity": 40}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Reviewer 5 — Victor (seeded in 06, guard included for safety)
INSERT INTO users (id, email, username, first_name, last_name, role, status, skills, performance_metrics, availability)
VALUES (
  '650e8400-e29b-41d4-a716-446655440023',
  'reviewer5@welo.com', 'rev_victor', 'Victor', 'Santos', 'REVIEWER', 'ACTIVE',
  '[{"skillName": "Quality Review", "proficiency": "EXPERT"}, {"skillName": "Video Review", "proficiency": "ADVANCED"}]'::jsonb,
  '{"tasksCompleted": 201, "averageQuality": 94.7, "averageSpeed": 83.2, "accuracyRate": 95.3}'::jsonb,
  '{"timezone": "America/Sao_Paulo", "workingHours": {"monday": "9-17", "friday": "9-17"}, "capacity": 45}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SECTION 3 — PROJECT TEAM MEMBERS (IDEMPOTENT TOP-UP)
-- =============================================================================
-- Reviewer 2 (Eve, ID 006) is not assigned to any project in file 07 because
-- she was originally qa1 in the DB. Now that she is a REVIEWER, assign her to
-- Projects 1 and 2 to mirror the team structure used in development.
-- ON CONFLICT DO NOTHING makes this safe to re-run.
-- =============================================================================

INSERT INTO project_team_members (project_id, user_id, role, quota, is_active)
VALUES
  -- Project 1: Sentiment Analysis Dataset
  ('850e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440006', 'REVIEWER', 15, true),
  -- Project 2: Image Classification Project
  ('850e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440006', 'REVIEWER', 15, true)
ON CONFLICT (project_id, user_id) DO NOTHING;

-- =============================================================================
-- SECTION 4 — SAMPLE PLUGIN CONFIGURATIONS
-- =============================================================================
-- Adds pre-deployed SCRIPT plugins to two projects so that the Plugin
-- Management feature is immediately visible and testable after setup.
-- Plugins are only inserted when the configuration->plugins key is absent
-- (WHERE guard prevents overwriting any plugins a team member has already
-- created through the UI).
--
-- Passwords / API keys: none — these are all SCRIPT plugins (no network calls).
-- Scripts run in the vm.runInNewContext() sandbox (3-second timeout).
-- =============================================================================

-- ── Project 3: Customer Sentiment Analysis — two SCRIPT plugins ───────────
UPDATE projects
SET configuration = jsonb_set(
  configuration,
  '{plugins}',
  '[
    {
      "id":              "plug-demo-sent-01",
      "name":            "Confidence Gate",
      "description":     "Rejects submission when confidence rating (aq-sent-09) is below 3.",
      "type":            "SCRIPT",
      "enabled":         true,
      "trigger":         "ON_BLUR",
      "onFailBehavior":  "HARD_BLOCK",
      "questionBindings":["aq-sent-09"],
      "isDraft":         false,
      "version":         1,
      "createdAt":       "2026-01-01T00:00:00Z",
      "updatedAt":       "2026-01-01T00:00:00Z",
      "deployedAt":      "2026-01-01T00:00:00Z",
      "scriptCode":      "function validate(question, answer, context) { var v = parseInt(answer.value, 10); if (isNaN(v) || v < 3) { return { result: ''FAIL'', message: ''Confidence rating must be at least 3. Re-assess your annotation before submitting.'' }; } return { result: ''PASS'' }; }"
    },
    {
      "id":              "plug-demo-sent-02",
      "name":            "Key Phrases Advisory",
      "description":     "Soft advisory when the key-phrases free-text field (aq-sent-06) is empty.",
      "type":            "SCRIPT",
      "enabled":         true,
      "trigger":         "ON_BLUR",
      "onFailBehavior":  "SOFT_WARN",
      "questionBindings":["aq-sent-06"],
      "isDraft":         false,
      "version":         1,
      "createdAt":       "2026-01-01T00:00:00Z",
      "updatedAt":       "2026-01-01T00:00:00Z",
      "deployedAt":      "2026-01-01T00:00:00Z",
      "scriptCode":      "function validate(question, answer, context) { if (!answer.value || answer.value.toString().trim() === '''') { return { result: ''WARN'', message: ''Key phrases field is empty. Adding relevant phrases improves annotation quality.'' }; } return { result: ''PASS'' }; }"
    }
  ]'::jsonb
)
WHERE id = '850e8400-e29b-41d4-a716-446655440003'
  AND (configuration->>'plugins') IS NULL;

-- ── Project 7: Data Quality Assessment — one SCRIPT plugin ────────────────
UPDATE projects
SET configuration = jsonb_set(
  configuration,
  '{plugins}',
  '[
    {
      "id":              "plug-demo-csv-01",
      "name":            "Low Quality Score Warning",
      "description":     "Soft warn when the data quality score (aq-csv-03) is below 30, prompting annotators to document issues.",
      "type":            "SCRIPT",
      "enabled":         true,
      "trigger":         "ON_BLUR",
      "onFailBehavior":  "SOFT_WARN",
      "questionBindings":["aq-csv-03"],
      "isDraft":         false,
      "version":         1,
      "createdAt":       "2026-01-01T00:00:00Z",
      "updatedAt":       "2026-01-01T00:00:00Z",
      "deployedAt":      "2026-01-01T00:00:00Z",
      "scriptCode":      "function validate(question, answer, context) { var score = parseFloat(answer.value); if (isNaN(score) || score < 30) { return { result: ''WARN'', message: ''Quality score below 30 indicates a critically poor record. Document specific issues in the notes field before submitting.'' }; } return { result: ''PASS'' }; }"
    }
  ]'::jsonb
)
WHERE id = '850e8400-e29b-41d4-a716-446655440007'
  AND (configuration->>'plugins') IS NULL;

-- =============================================================================
-- SECTION 5 — VERIFICATION QUERIES (printed on startup)
-- =============================================================================

SELECT '============================================================' AS "INFO";
SELECT '  WELO PLATFORM — TEAM CREDENTIALS REFERENCE               ' AS "INFO";
SELECT '============================================================' AS "INFO";

-- Full user roster with role and email (matches mock-users.json)
SELECT
  RPAD(u.role, 18)                     AS "Role",
  u.email                               AS "Email (login)",
  u.first_name || ' ' || u.last_name   AS "Full Name",
  u.id                                  AS "UUID"
FROM users u
WHERE u.id LIKE '650e8400%'
ORDER BY
  CASE u.role
    WHEN 'ADMIN'           THEN 1
    WHEN 'PROJECT_MANAGER' THEN 2
    WHEN 'REVIEWER'        THEN 3
    WHEN 'ANNOTATOR'       THEN 4
    WHEN 'QA'              THEN 5
    ELSE 6
  END,
  u.email;

SELECT '------------------------------------------------------------' AS "INFO";
SELECT '  PASSWORDS  (stored in apps/auth-service/src/auth/mock-users.json)' AS "INFO";
SELECT '------------------------------------------------------------' AS "INFO";
SELECT '  ADMIN           admin@welo.com          → admin123'        AS "INFO";
SELECT '  PROJECT_MANAGER pm1@welo.com pm2@welo.com → pm1234'       AS "INFO";
SELECT '  REVIEWER        reviewer1-5@welo.com    → reviewer123'     AS "INFO";
SELECT '  ANNOTATOR       annotator1-15@welo.com  → annotator123'    AS "INFO";
SELECT '============================================================' AS "INFO";

-- Project summary: team size, questions and plugins per project
SELECT '  PROJECTS — TEAM, QUESTIONS & PLUGINS                      ' AS "INFO";
SELECT '------------------------------------------------------------' AS "INFO";

SELECT
  p.name                                                                                        AS "Project",
  p.project_type                                                                                AS "Type",
  p.status                                                                                      AS "Status",
  COUNT(ptm.id) FILTER (WHERE ptm.role = 'ANNOTATOR')                                          AS "Annotators",
  COUNT(ptm.id) FILTER (WHERE ptm.role = 'REVIEWER')                                           AS "Reviewers",
  jsonb_array_length(COALESCE(p.configuration->'annotationQuestions', '[]'::jsonb))            AS "Questions",
  jsonb_array_length(COALESCE(p.configuration->'plugins',             '[]'::jsonb))            AS "Plugins"
FROM projects p
LEFT JOIN project_team_members ptm ON ptm.project_id = p.id AND ptm.is_active = true
GROUP BY p.id, p.name, p.project_type, p.status
ORDER BY p.created_at;

SELECT '============================================================' AS "INFO";
SELECT '  Team collaboration setup complete. Happy annotating!      ' AS "INFO";
SELECT '============================================================' AS "INFO";
