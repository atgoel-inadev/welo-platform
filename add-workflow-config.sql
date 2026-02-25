-- Add workflow configuration to project
UPDATE projects 
SET configuration = jsonb_set(
  configuration,
  '{workflowConfiguration}',
  '{
    "stages": [
      {
        "id": "stage_annotation",
        "name": "Annotation",
        "type": "annotation",
        "auto_assign": true,
        "annotators_count": 1,
        "order": 1
      },
      {
        "id": "stage_review",
        "name": "Review",
        "type": "review",
        "auto_assign": true,
        "reviewers_count": 1,
        "order": 2
      }
    ]
  }'::jsonb
)
WHERE id = '850e8400-e29b-41d4-a716-446655440001';

-- Verify
SELECT id, name, configuration->'workflowConfiguration'->'stages' as stages
FROM projects
WHERE id = '850e8400-e29b-41d4-a716-446655440001';
