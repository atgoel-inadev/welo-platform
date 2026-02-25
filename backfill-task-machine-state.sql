-- Backfill existing tasks with currentStage in machine_state
-- Set all tasks to the first workflow stage (annotation)
UPDATE tasks
SET machine_state = jsonb_set(
  jsonb_set(
    COALESCE(machine_state, '{}'::jsonb),
    '{context}',
    COALESCE(machine_state->'context', '{}'::jsonb)
  ),
  '{context,currentStage}',
  '"stage_annotation"'
)
WHERE project_id = '850e8400-e29b-41d4-a716-446655440001'
AND (machine_state->'context'->>'currentStage' IS NULL OR machine_state->'context'->>'currentStage' = '');

-- Verify
SELECT id, status, machine_state->'context'->>'currentStage' as current_stage
FROM tasks
WHERE project_id = '850e8400-e29b-41d4-a716-446655440001'
LIMIT 10;
