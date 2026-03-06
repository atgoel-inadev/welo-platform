# Shared Infrastructure Library - Verification Guide

## Pre-Verification Checklist

✅ Infrastructure library created at `libs/infrastructure/`  
✅ All 5 services updated to import from `@app/infrastructure`  
✅ TypeScript path mappings configured in `tsconfig.json`  
✅ Nest CLI configuration updated with infrastructure library  
✅ No TypeScript compilation errors  

## Step-by-Step Verification

### 1. Build the Infrastructure Library

```powershell
# Navigate to workspace root
cd C:\Users\INILPTP193\OneDrive - inadev.com\Workspace\wELO\welo-platform

# Install dependencies (if needed)
npm install

# Build the infrastructure library
npm run build infrastructure
```

**Expected Output:**
```
Successfully compiled: 9 files with @nestjs/cli
```

### 2. Build Individual Services

Test each service to ensure it can import and use the shared infrastructure:

```powershell
# Build all services
npm run build

# Or build individually
npm run build auth-service
npm run build workflow-engine
npm run build task-management
npm run build project-management
npm run build annotation-qa-service
```

**Expected Result:** No compilation errors.

### 3. Docker Build Verification

Test that Docker builds work with the shared library:

```powershell
# Build task-management (uses Kafka + Redis + Health)
docker compose build task-management

# Start the service
docker compose up -d task-management

# Check logs
docker compose logs -f task-management
```

**Expected logs:**
```
Kafka producer connected
Kafka consumer connected
Kafka admin connected
Created topics: task.created, task.updated, ...
Redis connected
Nest application successfully started
```

### 4. Health Endpoint Verification

Test the health endpoint for each service:

```powershell
# Task Management (port 3003)
Invoke-RestMethod -Uri "http://localhost:3003/health"

# Project Management (port 3004)
Invoke-RestMethod -Uri "http://localhost:3004/health"

# Annotation QA (port 3005)
Invoke-RestMethod -Uri "http://localhost:3005/health"

# Workflow Engine (port 3001)
Invoke-RestMethod -Uri "http://localhost:3001/health"

# Auth Service (port 3002)
Invoke-RestMethod -Uri "http://localhost:3002/health"
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "task-management",
  "version": "1.0.0",
  "timestamp": "2026-03-06T12:00:00.000Z"
}
```

### 5. Kafka Integration Test

Verify Kafka module is working:

```powershell
# Start task-management and project-management
docker compose up -d task-management project-management

# Check Kafka topics were created
docker compose exec kafka kafka-topics --list --bootstrap-server localhost:9092
```

**Expected Topics:**
- task.created
- task.updated
- task.assigned
- batch.created
- annotation.submitted
- (and more)

### 6. Redis Integration Test

Verify Redis module is working:

```powershell
# Connect to Redis
docker compose exec redis redis-cli

# In Redis CLI, check for service connections
> CLIENT LIST
```

**Expected Output:** Multiple connections from services.

### 7. Functional Test - Create Task Flow

Test end-to-end workflow with shared infrastructure:

```powershell
# 1. Create a task (triggers Kafka event)
$body = @{
  externalId = "TEST-001"
  projectId = "your-project-id"
  batchId = "your-batch-id"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3003/api/v1/tasks" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"

# 2. Check Redis cache
docker compose exec redis redis-cli GET "task:TEST-001"

# 3. Check Kafka topics for events
docker compose logs task-management | Select-String "Published message"
```

## Post-Verification Cleanup (Optional)

After confirming everything works, you can safely remove the old duplicate modules:

```powershell
# Task Management
Remove-Item -Recurse -Force apps/task-management/src/kafka
Remove-Item -Recurse -Force apps/task-management/src/redis
Remove-Item -Force apps/task-management/src/health/health.controller.ts

# Project Management
Remove-Item -Recurse -Force apps/project-management/src/kafka
Remove-Item -Recurse -Force apps/project-management/src/redis
Remove-Item -Force apps/project-management/src/controllers/health.controller.ts

# Annotation QA Service
Remove-Item -Recurse -Force apps/annotation-qa-service/src/kafka
Remove-Item -Force apps/annotation-qa-service/src/health/health.controller.ts

# Workflow Engine
Remove-Item -Recurse -Force apps/workflow-engine/src/redis
Remove-Item -Recurse -Force apps/workflow-engine/src/health

# Auth Service
Remove-Item -Force apps/auth-service/src/health/health.controller.ts

# Rebuild and test again
npm run build
docker compose build
docker compose up -d
```

## Troubleshooting

### Issue: Module not found '@app/infrastructure'

**Solution:**
```powershell
# Check tsconfig.json has path mappings
Get-Content tsconfig.json | Select-String "infrastructure"

# Rebuild
npm run build infrastructure
```

### Issue: Kafka not connecting

**Solution:**
```powershell
# Check Kafka is running
docker compose ps kafka

# Check environment variable
docker compose exec task-management env | Select-String "KAFKA"

# Expected: KAFKA_BROKERS=kafka:9092
```

### Issue: Redis connection errors

**Solution:**
```powershell
# Check Redis is running
docker compose ps redis

# Test connection
docker compose exec redis redis-cli PING

# Expected: PONG
```

### Issue: Health endpoint returns 404

**Solution:**
```typescript
// Verify HealthModule is imported in app.module.ts
import { HealthModule } from '@app/infrastructure';

@Module({
  imports: [
    HealthModule.forRoot({ 
      serviceName: 'service-name', 
      version: '1.0.0' 
    }),
  ],
})
```

## Success Criteria

✅ All services build without errors  
✅ All services start successfully in Docker  
✅ Health endpoints return 200 OK for all services  
✅ Kafka topics are created automatically  
✅ Redis connections established  
✅ Logs show "Kafka connected" and "Redis connected"  
✅ Swagger UI accessible for all services  
✅ Event publishing and subscription working  

## Performance Verification

Monitor that shared modules don't impact performance:

```powershell
# Check service startup time (should be similar to before)
docker compose up -d task-management
docker compose logs task-management | Select-String "successfully started"

# Check memory usage
docker stats --no-stream task-management

# Check Kafka message throughput (should be unchanged)
docker compose exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 --describe --all-groups
```

## Documentation Review

Ensure documentation is complete:

- [x] [libs/infrastructure/README.md](../../libs/infrastructure/README.md) - Detailed guide
- [x] [libs/infrastructure/QUICK_REFERENCE.md](../../libs/infrastructure/QUICK_REFERENCE.md) - Quick examples
- [x] [SHARED_INFRASTRUCTURE_SUMMARY.md](../../SHARED_INFRASTRUCTURE_SUMMARY.md) - Implementation summary

## Rollback Plan (If Issues Found)

If critical issues are discovered:

```powershell
# Revert changes to service modules
git checkout apps/*/src/app.module.ts
git checkout apps/*/src/project-management.module.ts

# Remove infrastructure library
Remove-Item -Recurse -Force libs/infrastructure

# Rebuild
npm run build
docker compose build
docker compose up -d
```

## Next Steps After Verification

1. ✅ Commit changes to version control
2. ✅ Update team on new shared infrastructure
3. ✅ Document in team wiki/confluence
4. 🔄 Create follow-up tasks for future enhancements:
   - Shared logging module
   - Shared metrics module
   - Shared database utilities

## Questions?

Refer to:
- [libs/infrastructure/README.md](../../libs/infrastructure/README.md) - Full API documentation
- [SHARED_INFRASTRUCTURE_SUMMARY.md](../../SHARED_INFRASTRUCTURE_SUMMARY.md) - Implementation details
- [.github/copilot-instructions.md](../.github/copilot-instructions.md) - Project standards
