# Fast Docker Build Commands

## Single Service Rebuild (Most Common)

```bash
# Build and restart only the service you changed
docker compose build auth-service && docker compose up -d auth-service
docker compose build project-management && docker compose up -d project-management
docker compose build task-management && docker compose up -d task-management
docker compose build workflow-engine && docker compose up -d workflow-engine
```

## Quick Restart (No Rebuild - For Env Changes)

```bash
docker compose restart auth-service
docker compose restart project-management
docker compose restart task-management
docker compose restart workflow-engine
```

## View Logs

```bash
docker compose logs -f auth-service
docker compose logs -f --tail 50 project-management
```

## Health Check

```bash
# Check if services are healthy
docker ps --filter "name=welo" --format "table {{.Names}}\t{{.Status}}"

# Test health endpoints
curl http://localhost:3001/api/v1/health  # workflow-engine
curl http://localhost:3002/api/v1/health  # auth-service
curl http://localhost:3003/api/v1/health  # task-management
curl http://localhost:3004/api/v1/health  # project-management
```

## Enable BuildKit (One-time Setup)

```powershell
# PowerShell (Windows)
$env:DOCKER_BUILDKIT=1
$env:COMPOSE_DOCKER_CLI_BUILD=1

# Or set in Docker Desktop settings:
# Settings > Docker Engine > add:
# {
#   "features": {
#     "buildkit": true
#   }
# }
```

## Emergency: Full Restart

```bash
# Only if absolutely necessary (loses all container state)
docker compose down
docker compose up -d
```

## See DOCKER_BUILD_GUIDE.md for detailed scenarios
