# Docker Build Optimization Guide

## Quick Reference for Developers

### Build Single Service (Fast - Only what changed)
```bash
# Build only the service you're working on
docker compose build auth-service
docker compose build project-management
docker compose build task-management
docker compose build workflow-engine

# Restart only that service
docker compose up -d auth-service
docker compose up -d project-management
```

### Build Multiple Services
```bash
# Build specific services (no cache for clean build)
docker compose build --no-cache auth-service project-management

# Or with cache (much faster)
docker compose build auth-service project-management
```

### Restart Single Service (Fastest)
```bash
# Just restart without rebuilding (for env changes)
docker compose restart auth-service

# Stop and start (preserves volumes)
docker compose stop auth-service
docker compose start auth-service

# Recreate container (keeps image)
docker compose up -d --force-recreate --no-deps auth-service
```

### View Logs for Single Service
```bash
docker compose logs -f auth-service
docker compose logs -f --tail 50 project-management
```

## Build Time Optimizations

### What We've Optimized:
1. **BuildKit Cache Mounts**: npm packages are cached between builds
2. **Layer Ordering**: package.json copied first for better caching
3. **Removed unnecessary steps**: No more `npm cache clean --force`
4. **Multi-stage builds**: Smaller production images
5. **Syntax directive**: `# syntax=docker/dockerfile:1.4` enables advanced features

### Expected Build Times:
- **First build** (cold cache): ~2-3 minutes per service
- **Incremental build** (with cache): ~10-30 seconds per service
- **No changes**: ~5 seconds (just layer verification)

### Enable BuildKit (if not already):
```bash
# Windows PowerShell
$env:DOCKER_BUILDKIT=1
$env:COMPOSE_DOCKER_CLI_BUILD=1

# Or set permanently in environment variables
```

## Best Practices

### ✅ DO:
- Build only the service you modified
- Use cache by default (no --no-cache)
- Restart single services: `docker compose restart <service>`
- Check logs of specific service: `docker compose logs -f <service>`
- Use `--no-deps` when recreating to avoid restarting dependencies

### ❌ DON'T:
- Don't run `docker compose down` unless necessary (loses all containers)
- Don't use `--no-cache` for every build (defeats optimization)
- Don't rebuild all services when changing one
- Don't restart infrastructure (postgres, redis, kafka) unless needed

## Common Scenarios

### Scenario 1: Fixed code in auth-service
```bash
# Build only auth-service (with cache)
docker compose build auth-service

# Restart just that service
docker compose up -d auth-service

# Check if it's working
docker compose logs -f auth-service
```

### Scenario 2: Changed shared library code
```bash
# Rebuild all services that use the shared lib
docker compose build auth-service task-management project-management workflow-engine

# Restart all app services (not infrastructure)
docker compose up -d auth-service task-management project-management workflow-engine
```

### Scenario 3: Environment variable change only
```bash
# No rebuild needed! Just restart
docker compose restart auth-service

# Or update docker-compose.yml and recreate
docker compose up -d auth-service
```

### Scenario 4: Clean rebuild of single service
```bash
# Stop service
docker compose stop auth-service

# Remove old image
docker rmi welo-platform-auth-service

# Rebuild clean
docker compose build --no-cache auth-service

# Start
docker compose up -d auth-service
```

### Scenario 5: Database schema changed
```bash
# Stop all app services (keep data)
docker compose stop auth-service task-management project-management workflow-engine

# Clear database (if needed)
docker compose down postgres
docker volume rm welo-platform_postgres_data

# Start fresh
docker compose up -d
```

## Troubleshooting

### Build is slow
1. Check if BuildKit is enabled: `docker buildx version`
2. Don't use `--no-cache` unless necessary
3. Ensure .dockerignore is excluding node_modules, dist, etc.
4. Check Docker Desktop settings: Increase CPU/Memory allocation

### Service won't start
```bash
# Check logs
docker compose logs auth-service

# Check if ports are in use
netstat -ano | findstr :3002

# Recreate container
docker compose up -d --force-recreate auth-service
```

### Health check failing
```bash
# Check health endpoint
curl http://localhost:3002/api/v1/health

# See detailed health status
docker inspect --format='{{json .State.Health}}' welo-auth-service
```

## Size Reduction Tips

Current image sizes:
- auth-service: 457MB
- task-management: 457MB  
- workflow-engine: 457MB
- project-management: 893MB (needs optimization)

To reduce further:
1. Use Alpine images (already done ✓)
2. Remove dev dependencies in production (already done ✓)
3. Use .dockerignore properly (already done ✓)
4. Consider using `node:24-alpine` slim base
5. Multi-stage builds (already done ✓)
