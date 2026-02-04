# Docker Deployment Guide

This guide explains how to run the Welo Platform microservices using Docker Desktop.

## Prerequisites

- Docker Desktop installed and running
- At least 4GB of available RAM
- Ports 3001-3003, 5432, and 6379 available

## Quick Start

1. **Start all services**:
   ```bash
   docker-compose up -d
   ```

2. **View logs**:
   ```bash
   docker-compose logs -f
   ```

3. **Stop all services**:
   ```bash
   docker-compose down
   ```

4. **Stop and remove volumes** (WARNING: This deletes all data):
   ```bash
   docker-compose down -v
   ```

## Service Endpoints

Once running, the following endpoints are available:

- **Workflow Engine**: http://localhost:3001
- **Auth Service**: http://localhost:3002
- **Task Management**: http://localhost:3003
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **Kafka**: localhost:9092

## Environment Variables

The docker-compose.yml file contains default environment variables. For production, create a `.env` file:

```env
# Database
POSTGRES_USER=welo_admin
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=welo_platform

# Redis
REDIS_PASSWORD=your_redis_password

# Services
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRATION=3600

# Ports
WORKFLOW_ENGINE_PORT=3001
AUTH_SERVICE_PORT=3002
TASK_MANAGEMENT_PORT=3003
```

## Database

### Initial Setup

The PostgreSQL database is automatically initialized with:
- Database schema (17 tables)
- Sample seed data (customers, users, projects, workflows, tasks)

Scripts are located in `docker/postgres/init/`:
- `01-schema.sql` - Creates all tables, indexes, and triggers
- `02-seed.sql` - Inserts sample data

### Accessing PostgreSQL

```bash
# Using Docker
docker-compose exec postgres psql -U welo_admin -d welo_platform

# Using local client
psql -h localhost -p 5432 -U welo_admin -d welo_platform
```

### Sample Users

The seed data includes these test users:

| Email | Username | Role | Password (default) |
|-------|----------|------|-------------------|
| admin@welo.com | admin | ADMIN | (set in auth service) |
| pm1@welo.com | pm_alice | PROJECT_MANAGER | (set in auth service) |
| annotator1@welo.com | ann_bob | ANNOTATOR | (set in auth service) |
| annotator2@welo.com | ann_carol | ANNOTATOR | (set in auth service) |
| reviewer1@welo.com | rev_david | REVIEWER | (set in auth service) |
| qa1@welo.com | qa_emily | QA | (set in auth service) |

## Development Workflow

### Rebuild Services

After code changes, rebuild specific services:

```bash
# Rebuild all services
docker-compose build

# Rebuild specific service
docker-compose build workflow-engine

# Rebuild and restart
docker-compose up -d --build workflow-engine
```

### View Service Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f workflow-engine
docker-compose logs -f postgres
```

### Execute Commands in Containers

```bash
# Shell access to workflow-engine
docker-compose exec workflow-engine sh

# Run npm commands
docker-compose exec workflow-engine npm run test

# Database backup
docker-compose exec postgres pg_dump -U welo_admin welo_platform > backup.sql
```

## Health Checks

All services include health checks:

```bash
# Check service status
docker-compose ps

# Check specific service health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

## Troubleshooting

### Services won't start

1. Check if ports are already in use:
   ```bash
   # Windows
   netstat -ano | findstr :3001
   netstat -ano | findstr :5432
   ```

2. Check Docker logs:
   ```bash
   docker-compose logs workflow-engine
   docker-compose logs postgres
   ```

### Database connection errors

1. Ensure PostgreSQL is healthy:
   ```bash
   docker-compose ps postgres
   ```

2. Check database logs:
   ```bash
   docker-compose logs postgres
   ```

3. Verify connection string in service logs

### Redis connection errors

1. Check Redis status:
   ```bash
   docker-compose ps redis
   ```

2. Test Redis connection:
   ```bash
   docker-compose exec redis redis-cli ping
   ```

### Kafka connection errors

1. Check Kafka status:
   ```bash
   docker-compose ps kafka
   ```

2. Test Kafka connection:
   ```bash
   docker-compose exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092
   ```

3. List Kafka topics:
   ```bash
   docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list
   ```

4. Create a test topic:
   ```bash
   docker-compose exec kafka kafka-topics --create --topic test --bootstrap-server localhost:9092
   ```

### Out of memory errors

1. Increase Docker Desktop memory allocation (Settings > Resources)
2. Reduce number of running services

### Database already exists error

If you see "database already exists" during initialization:

```bash
# Stop containers and remove volumes
docker-compose down -v

# Restart
docker-compose up -d
```

## Production Considerations

For production deployment:

1. **Use environment files**: Create `.env` file with secure credentials
2. **Enable SSL/TLS**: Configure PostgreSQL and services for encrypted connections
3. **Set resource limits**: Add memory and CPU limits to docker-compose.yml
4. **Use secrets management**: Store sensitive data in Docker secrets or external vault
5. **Enable monitoring**: Add Prometheus/Grafana for metrics
6. **Configure logging**: Send logs to centralized logging system
7. **Regular backups**: Implement automated database backup strategy
8. **Use orchestration**: Consider Kubernetes for production scale

## Network Architecture

Services communicate over a dedicated bridge network (`welo-network`):

```
┌──────────────────────────────────────────────────────────────┐
│                  welo-network (bridge)                       │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌───────────┐             │
│  │ Workflow   │  │   Auth     │  │   Task    │             │
│  │  Engine    │  │  Service   │  │  Mgmt     │             │
│  │  :3001     │  │   :3002    │  │  :3003    │             │
│  └─────┬──────┘  └──────┬─────┘  └─────┬─────┘             │
│        │                │               │                   │
│        └────────────────┼───────────────┘                   │
│                         │                                   │
│        ┌────────────────┴─────────────┐                     │
│        │                              │                     │
│  ┌─────▼──────┐  ┌─────▼──────┐  ┌───▼──────┐             │
│  │ PostgreSQL │  │   Redis    │  │  Kafka   │             │
│  │   :5432    │  │   :6379    │  │  :9092   │             │
│  └────────────┘  └────────────┘  └──────────┘             │
│                                                              │
│  Event-Driven Communication:                                │
│  - Services publish events to Kafka topics                  │
│  - Services consume events from Kafka topics                │
│  - Redis caches compiled state machines & sessions          │
│  - PostgreSQL stores persistent state & entities            │
└──────────────────────────────────────────────────────────────┘
```

### Kafka Topics

The following Kafka topics are used for event-driven communication:

**Workflow Engine publishes:**
- `state.transitioned` - State machine transitions
- `workflow.instance.started` - New workflow instance
- `workflow.instance.completed` - Completed workflow
- `workflow.instance.failed` - Failed workflow

**Task Management publishes:**
- `task.created` - New task created
- `task.assigned` - Task assigned to user
- `task.updated` - Task status updated
- `task.completed` - Task completed
- `batch.created` - New batch created
- `batch.completed` - Batch completed

**Auth Service publishes:**
- `user.registered` - New user registration
- `user.logged_in` - User login event
- `user.logged_out` - User logout event

## Volume Management

Persistent data is stored in Docker volumes:

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect weloworkspace_postgres_data

# Backup volume
docker run --rm -v weloworkspace_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# Restore volume
docker run --rm -v weloworkspace_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

## Next Steps

1. Implement authentication in auth-service
2. Add API documentation (Swagger/OpenAPI)
3. Implement health check endpoints in all services
4. Add integration tests
5. Set up CI/CD pipeline
6. Configure monitoring and alerting

## Support

For issues or questions:
- Check service logs: `docker-compose logs -f`
- Verify environment configuration
- Ensure all required ports are available
- Check Docker Desktop has sufficient resources
