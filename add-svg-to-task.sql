-- Add SVG file to task for testing
UPDATE tasks
SET 
  file_url = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iI0Y1OUUwQiIvPgogIDx0ZXh0IHg9IjQwMCIgeT0iMjgwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iNDgiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCI+CiAgICBTYW1wbGUgSW1hZ2UgMwogIDwvdGV4dD4KICA8Y2lyY2xlIGN4PSI0MDAiIGN5PSI0MDAiIHI9IjgwIiBmaWxsPSIjRkZGRkZGIiBvcGFjaXR5PSIwLjMiLz4KICA8Y2lyY2xlIGN4PSI0MDAiIGN5PSI0MDAiIHI9IjYwIiBmaWxsPSIjRkZGRkZGIiBvcGFjaXR5PSIwLjUiLz4KICA8Y2lyY2xlIGN4PSI0MDAiIGN5PSI0MDAiIHI9IjQwIiBmaWxsPSIjRkZGRkZGIiBvcGFjaXR5PSIwLjciLz4KPC9zdmc+',
  file_metadata = jsonb_build_object(
    'fileName', 'sample-image-3.svg',
    'fileSize', 512,
    'mimeType', 'image/svg+xml'
  )
WHERE id = 'a50e8400-e29b-41d4-a716-446655440003';

-- Verify update
SELECT 
  id,
  external_id,
  LEFT(file_url, 50) as file_url_preview,
  file_metadata->>'fileName' as file_name,
  file_metadata->>'mimeType' as mime_type
FROM tasks
WHERE id = 'a50e8400-e29b-41d4-a716-446655440003';
