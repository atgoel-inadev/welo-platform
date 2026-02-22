UPDATE tasks
SET 
  file_url = 'https://dev.w3.org/SVG/tools/svgweb/samples/svg-files/android.svg',
  file_metadata = jsonb_build_object(
    'fileName', 'android.svg',
    'fileSize', 5120,
    'mimeType', 'image/svg+xml'
  )
WHERE external_id = 'TASK-003';

SELECT 
  external_id, 
  file_url,
  file_metadata->>'fileName' as file_name,
  file_metadata->>'mimeType' as mime_type
FROM tasks 
WHERE external_id = 'TASK-003';

