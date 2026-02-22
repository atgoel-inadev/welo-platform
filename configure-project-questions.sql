-- Add annotation questions to project configuration
UPDATE projects
SET configuration = jsonb_set(
  configuration,
  '{annotationQuestions}',
  '[
    {
      "id": "q1",
      "text": "What is the sentiment of this text?",
      "type": "single_select",
      "options": [
        {"label": "Positive", "value": "positive"},
        {"label": "Negative", "value": "negative"},
        {"label": "Neutral", "value": "neutral"}
      ],
      "required": true
    },
    {
      "id": "q2",
      "text": "Rate your confidence in this annotation",
      "type": "rating",
      "maxRating": 5,
      "required": true
    },
    {
      "id": "q3",
      "text": "Additional comments (optional)",
      "type": "textarea",
      "rows": 3,
      "required": false
    }
  ]'::jsonb
)
WHERE id = '850e8400-e29b-41d4-a716-446655440001';

-- Add file URLs to tasks for testing
UPDATE tasks
SET 
  file_url = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  file_metadata = jsonb_build_object(
    'fileName', 'sample-document.pdf',
    'fileSize', 13264,
    'mimeType', 'application/pdf'
  )
WHERE id = 'a50e8400-e29b-41d4-a716-446655440001';

UPDATE tasks
SET 
  file_url = 'https://www.w3.org/TR/PNG/iso_8859-1.txt',
  file_metadata = jsonb_build_object(
    'fileName', 'sample-text.txt',
    'fileSize', 5432,
    'mimeType', 'text/plain'
  )
WHERE id = 'a50e8400-e29b-41d4-a716-446655440002';

-- Verify configuration
SELECT 
  id,
  name,
  jsonb_pretty(configuration->'annotationQuestions') as questions
FROM projects
WHERE id = '850e8400-e29b-41d4-a716-446655440001';

-- Verify tasks
SELECT 
  id,
  external_id,
  file_url,
  file_metadata->>'fileName' as file_name
FROM tasks
WHERE id IN ('a50e8400-e29b-41d4-a716-446655440001', 'a50e8400-e29b-41d4-a716-446655440002')
ORDER BY external_id;
