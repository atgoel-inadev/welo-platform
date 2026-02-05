# UI Configuration Storage & Backend Integration

## Overview

UI configurations are stored in the **Project** entity's `configuration` field as a JSONB column in PostgreSQL. This provides:
- **Flexibility**: Schema-less storage for dynamic UI definitions
- **Performance**: Native JSON operations in PostgreSQL
- **Versioning**: Built-in version history tracking
- **Scalability**: No schema migrations needed for UI changes

## Architecture

### Storage Layer

```
┌─────────────────────────────────────────────────────────┐
│                    Project Entity                        │
├─────────────────────────────────────────────────────────┤
│ configuration: {                                         │
│   uiConfiguration: {                                     │
│     configuration: {                   ← Current config  │
│       id: string                                         │
│       version: string                                    │
│       name: string                                       │
│       fileType: FileType                                 │
│       responseType: ResponseType                         │
│       widgets: Widget[]                                  │
│       layout: Layout                                     │
│       styles: Styles                                     │
│       behaviors: Behaviors                               │
│     },                                                   │
│     versions: [                        ← Version history │
│       {                                                  │
│         version: string                                  │
│         configuration: UIConfiguration                   │
│         createdBy: string                                │
│         createdAt: string                                │
│         description: string                              │
│       }                                                  │
│     ]                                                    │
│   },                                                     │
│   annotationSchema: {},                                  │
│   qualityThresholds: {},                                 │
│   workflowRules: {}                                      │
│ }                                                        │
└─────────────────────────────────────────────────────────┘
```

### Service Layer

**UIConfigurationService** handles all UI configuration operations:

```typescript
// Location: apps/project-management/src/services/ui-configuration.service.ts

@Injectable()
export class UIConfigurationService {
  // CRUD Operations
  createOrUpdateUIConfiguration(projectId, dto, userId)
  getUIConfiguration(projectId)
  deleteUIConfiguration(projectId)
  
  // Version Management
  getUIConfigurationVersions(projectId)
  getUIConfigurationVersion(projectId, version)
  rollbackToVersion(projectId, version, userId)
  
  // Validation
  validateUIConfiguration(config)
}
```

### Controller Layer

**UIConfigurationController** exposes RESTful API:

```typescript
// Location: apps/project-management/src/controllers/ui-configuration.controller.ts

@Controller('api/v1/projects/:projectId/ui-configurations')
export class UIConfigurationController {
  POST   /                            // Create/Update configuration
  GET    /                            // Get current configuration
  PUT    /                            // Update configuration
  GET    /versions                    // Get all versions
  GET    /versions/:version           // Get specific version
  POST   /versions/:version/rollback  // Rollback to version
  DELETE /                            // Delete configuration
}
```

## API Endpoints

### 1. Create or Update UI Configuration

**POST** `/api/v1/projects/:projectId/ui-configurations`

**Request Body:**
```json
{
  "name": "Text Annotation UI",
  "description": "UI for text annotation tasks",
  "configuration": {
    "id": "ui-config-1",
    "version": "1.0.0",
    "name": "Text Annotation UI",
    "fileType": "TEXT",
    "responseType": "TEXT",
    "widgets": [
      {
        "id": "file-viewer-1",
        "type": "FILE_VIEWER",
        "position": { "x": 0, "y": 0 },
        "size": { "width": 100, "height": 300 },
        "order": 0
      },
      {
        "id": "text-input-1",
        "type": "TEXT_INPUT",
        "label": "Enter your annotation",
        "required": true,
        "position": { "x": 0, "y": 320 },
        "size": { "width": 100, "height": 40 },
        "order": 1
      }
    ],
    "layout": {
      "type": "FLEX",
      "gap": 20,
      "padding": 16
    },
    "styles": {
      "theme": "LIGHT",
      "primaryColor": "#3B82F6"
    }
  }
}
```

**Response:**
```json
{
  "id": "project-uuid",
  "version": "2024.2.5-143055",
  "name": "Text Annotation UI",
  "description": "UI for text annotation tasks",
  "configuration": { /* full config */ },
  "projectId": "project-uuid",
  "createdBy": "user-uuid",
  "createdAt": "2024-02-05T14:30:55Z",
  "metadata": {
    "totalWidgets": 2,
    "fileType": "TEXT",
    "responseType": "TEXT",
    "pipelineModes": ["ANNOTATION"]
  }
}
```

### 2. Get Current UI Configuration

**GET** `/api/v1/projects/:projectId/ui-configurations`

**Response:**
```json
{
  "id": "project-uuid",
  "version": "2024.2.5-143055",
  "name": "Text Annotation UI",
  "configuration": { /* full config */ },
  "projectId": "project-uuid",
  "createdBy": "user-uuid",
  "createdAt": "2024-02-05T14:30:55Z",
  "metadata": {
    "totalWidgets": 2,
    "fileType": "TEXT",
    "responseType": "TEXT",
    "pipelineModes": ["ANNOTATION", "REVIEW"]
  }
}
```

### 3. Get Version History

**GET** `/api/v1/projects/:projectId/ui-configurations/versions`

**Response:**
```json
[
  {
    "version": "2024.2.5-143055",
    "description": "Added review widgets",
    "createdBy": "user-uuid",
    "createdAt": "2024-02-05T14:30:55Z",
    "totalWidgets": 5
  },
  {
    "version": "2024.2.5-120000",
    "description": "Initial UI configuration",
    "createdBy": "user-uuid",
    "createdAt": "2024-02-05T12:00:00Z",
    "totalWidgets": 2
  }
]
```

### 4. Rollback to Version

**POST** `/api/v1/projects/:projectId/ui-configurations/versions/:version/rollback`

**Response:**
```json
{
  "id": "project-uuid",
  "version": "2024.2.5-150000",
  "name": "Text Annotation UI",
  "description": "Rolled back to version 2024.2.5-120000",
  "configuration": { /* config from that version */ },
  "projectId": "project-uuid",
  "createdBy": "user-uuid",
  "createdAt": "2024-02-05T15:00:00Z"
}
```

## Frontend Integration

### Service Layer

**Location:** `src/services/uiConfigurationService.ts`

```typescript
// Create configuration
await createUIConfiguration(projectId, {
  name: 'My UI',
  configuration: uiConfig
});

// Get configuration
const config = await getUIConfiguration(projectId);

// Update configuration
await updateUIConfiguration(projectId, {
  name: 'Updated UI',
  configuration: updatedConfig
});

// Get versions
const versions = await getUIConfigurationVersions(projectId);

// Rollback
await rollbackUIConfiguration(projectId, '2024.2.5-120000');

// Delete
await deleteUIConfiguration(projectId);
```

### UI Builder Integration

**Location:** `src/pages/ops/UIBuilderPage.tsx`

```typescript
// Load existing configuration
useEffect(() => {
  if (projectId) {
    const response = await getUIConfiguration(projectId);
    setInitialConfig(response.configuration);
  }
}, [projectId]);

// Save configuration
const handleSave = async (configuration) => {
  await updateUIConfiguration(projectId, {
    name: configuration.name,
    description: 'Updated via UI Builder',
    configuration
  });
  navigate(`/ops/projects/${projectId}/edit`);
};
```

## Data Flow

### Creating UI Configuration

```
┌──────────────┐    POST      ┌──────────────────────┐    Validate    ┌─────────────────┐
│  UI Builder  │ ──────────> │  UIConfiguration     │ ────────────> │  Validation     │
│  (Frontend)  │   JSON      │     Controller       │   Structure   │     Logic       │
└──────────────┘             └──────────────────────┘               └─────────────────┘
                                       │                                     │
                                       v                                     v
                             ┌──────────────────────┐                  ✓ Valid
                             │  UIConfiguration     │                       │
                             │      Service         │ <─────────────────────┘
                             └──────────────────────┘
                                       │
                                       v
                             ┌──────────────────────┐
                             │   Generate Version   │
                             │    Create History    │
                             └──────────────────────┘
                                       │
                                       v
                             ┌──────────────────────┐
                             │  Update Project      │
                             │  configuration JSONB │
                             └──────────────────────┘
                                       │
                                       v
                             ┌──────────────────────┐
                             │    PostgreSQL        │
                             │  (Persisted JSONB)   │
                             └──────────────────────┘
```

### Using UI Configuration in Tasks

```
┌──────────────┐   Load Task   ┌──────────────────────┐   Include Config   ┌─────────────────┐
│  Annotator   │ ────────────> │    Task Service      │ ─────────────────> │  Task Entity    │
│   Frontend   │               └──────────────────────┘                    │  + Project      │
└──────────────┘                                                           └─────────────────┘
       │                                                                            │
       │                                                                            v
       │                                                                  ┌─────────────────┐
       │                                                                  │  UI Config from │
       │ <───────────────────────────────────────────────────────────────│ Project.config  │
       │                     Task Data + UI Configuration                └─────────────────┘
       v
┌──────────────────────┐
│  DynamicUIRenderer   │
│  Renders UI from     │
│  configuration       │
└──────────────────────┘
```

## Database Schema

### Current Implementation

UI configurations are stored in the existing `projects.configuration` JSONB field:

```sql
-- No new tables needed!
-- Uses existing Project entity

SELECT configuration->'uiConfiguration' 
FROM projects 
WHERE id = 'project-uuid';

-- Query specific version
SELECT jsonb_array_elements(
  configuration->'uiConfiguration'->'versions'
) AS version
FROM projects
WHERE id = 'project-uuid';
```

### JSONB Structure

```json
{
  "uiConfiguration": {
    "configuration": {
      "id": "ui-config-1",
      "version": "1.0.0",
      "name": "Text Annotation UI",
      "fileType": "TEXT",
      "responseType": "TEXT",
      "widgets": [...],
      "layout": {...},
      "styles": {...}
    },
    "versions": [
      {
        "version": "2024.2.5-143055",
        "configuration": {...},
        "createdBy": "user-uuid",
        "createdAt": "2024-02-05T14:30:55Z",
        "description": "Latest version"
      }
    ]
  },
  "annotationSchema": {...},
  "qualityThresholds": {...},
  "workflowRules": {...}
}
```

### Advantages of JSONB Storage

1. **No Schema Migrations**: UI changes don't require database migrations
2. **Atomic Updates**: JSONB operations are atomic
3. **Native Indexing**: PostgreSQL can index JSONB fields
4. **Query Performance**: Fast JSON operations with GIN indexes
5. **Version History**: Store entire history in same field

### Performance Optimization

```sql
-- Create GIN index for fast JSONB queries
CREATE INDEX idx_project_ui_config 
ON projects USING GIN (configuration);

-- Query widgets by type
SELECT id, name, 
       configuration->'uiConfiguration'->'configuration'->'widgets' 
FROM projects 
WHERE configuration->'uiConfiguration'->'configuration'->>'fileType' = 'TEXT';
```

## Version Management

### Version Format

**Semantic Date Version**: `YYYY.M.D-HHmmss`

Example: `2024.2.5-143055` (February 5, 2024, 14:30:55)

### Version Lifecycle

1. **Create**: New version created on every save
2. **Store**: Appended to versions array (last 50 kept)
3. **Rollback**: Copy old version as new current version
4. **Compare**: Frontend can diff versions
5. **Cleanup**: Automatic cleanup of versions older than 50

### Version Operations

```typescript
// Get all versions
const versions = await getUIConfigurationVersions(projectId);

// Get specific version
const v1 = await getUIConfigurationVersion(projectId, '2024.2.5-120000');

// Rollback to version
await rollbackUIConfiguration(projectId, '2024.2.5-120000');
```

## Validation

### Backend Validation

**UIConfigurationService.validateUIConfiguration()** ensures:

- ✅ Required fields present (fileType, responseType, widgets)
- ✅ Widgets have id, type, position, size
- ✅ Valid fileType (TEXT, IMAGE, etc.)
- ✅ Valid responseType (TEXT, SINGLE_SELECT, etc.)
- ✅ Position/size are valid numbers
- ✅ No duplicate widget IDs

### Validation Errors

```typescript
// Missing required field
{
  "statusCode": 400,
  "message": "UI configuration missing required field: widgets"
}

// Invalid widget
{
  "statusCode": 400,
  "message": "Widget at index 2 missing required fields (id, type)"
}

// Invalid fileType
{
  "statusCode": 400,
  "message": "Invalid fileType. Must be one of: TEXT, MARKDOWN, HTML, IMAGE, VIDEO, AUDIO, CSV, PDF"
}
```

## Error Handling

### Common Errors

| Status | Error | Cause | Solution |
|--------|-------|-------|----------|
| 404 | Project not found | Invalid projectId | Verify project exists |
| 404 | Configuration not found | No UI config created yet | Create new configuration |
| 404 | Version not found | Invalid version number | Check version history |
| 400 | Invalid configuration | Validation failed | Fix configuration structure |
| 500 | Database error | PostgreSQL issue | Check database connection |

### Frontend Error Handling

```typescript
try {
  await createUIConfiguration(projectId, config);
} catch (error) {
  if (error.response?.status === 404) {
    // Project not found
    toast.error('Project not found');
  } else if (error.response?.status === 400) {
    // Validation error
    const message = error.response.data.message;
    toast.error(`Validation failed: ${message}`);
  } else {
    // General error
    toast.error('Failed to save configuration');
  }
}
```

## Testing

### Backend Tests

```bash
# Test UI configuration endpoints
npm run test apps/project-management/src/services/ui-configuration.service.spec.ts

# Test validation
npm run test apps/project-management/src/services/ui-configuration.validation.spec.ts
```

### Manual Testing

```bash
# 1. Start backend
cd welo-platform
docker compose up project-management

# 2. Create configuration
curl -X POST http://localhost:3004/api/v1/projects/PROJECT_ID/ui-configurations \
  -H "Content-Type: application/json" \
  -d @ui-config.json

# 3. Get configuration
curl http://localhost:3004/api/v1/projects/PROJECT_ID/ui-configurations

# 4. Get versions
curl http://localhost:3004/api/v1/projects/PROJECT_ID/ui-configurations/versions
```

## Deployment

### Environment Variables

```env
# Backend (project-management)
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=welo

# Frontend
VITE_API_URL=http://localhost:3004
```

### Docker Rebuild

```bash
# Rebuild only project-management service
docker compose build project-management
docker compose up -d project-management

# View logs
docker compose logs -f project-management
```

## Migration Guide

### From Old System

If migrating from a separate UI configuration table:

```sql
-- Migrate data to project.configuration
UPDATE projects p
SET configuration = jsonb_set(
  COALESCE(configuration, '{}'::jsonb),
  '{uiConfiguration}',
  (SELECT row_to_json(ui)::jsonb 
   FROM ui_configurations ui 
   WHERE ui.project_id = p.id)
);

-- Drop old table (after verification)
-- DROP TABLE ui_configurations;
```

## Best Practices

1. **Version on Every Save**: Always create new version
2. **Validate Before Save**: Frontend validation + backend validation
3. **Keep History Manageable**: Limit to last 50 versions
4. **Use Descriptive Names**: Help users understand changes
5. **Test Configurations**: Preview before saving
6. **Handle Errors Gracefully**: Show clear error messages
7. **Monitor Performance**: Watch JSONB query performance
8. **Index Wisely**: Create GIN indexes for frequently queried fields

## Summary

✅ **Storage**: JSONB field in Project entity  
✅ **Backend**: UIConfigurationService + Controller  
✅ **API**: RESTful endpoints for CRUD + versioning  
✅ **Frontend**: React service layer + UI Builder integration  
✅ **Versioning**: Automatic version history (last 50)  
✅ **Validation**: Comprehensive structure validation  
✅ **Performance**: PostgreSQL JSONB with GIN indexes  
✅ **Scalability**: No schema changes needed for UI updates  

The UI configuration system is **fully integrated** into the project-management service and ready for use!
