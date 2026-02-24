# Local Development Setup Guide

This guide explains how to run the Welo Platform in **local development mode** with:
- **Infrastructure (Postgres, Redis, Kafka)** running in Docker
- **Node services** running directly in terminals for faster iteration

---

## Quick Start

### 1. Start Infrastructure (Docker)

Open a terminal and run:

```powershell
cd welo-platform
docker compose -f docker-compose.infra.yml up -d
```

This starts:
- **PostgreSQL** (port 5432)
- **Redis** (port 6379)
- **Kafka** (port 9092)

**Verify containers are running:**
```powershell
docker ps
```

You should see: `welo-postgres`, `welo-redis`, `welo-kafka`

---

### 2. Start Node Services (Terminals)

Open **5 separate terminals** (or use VS Code split terminals) and run these commands:

#### Terminal 1: Workflow Engine (Port 3001)
```powershell
cd welo-platform
.\scripts\start-workflow-engine.ps1
```

#### Terminal 2: Auth Service (Port 3002)
```powershell
cd welo-platform
.\scripts\start-auth-service.ps1
```

#### Terminal 3: Task Management (Port 3003)
```powershell
cd welo-platform
.\scripts\start-task-management.ps1
```

#### Terminal 4: Project Management (Port 3004)
```powershell
cd welo-platform
.\scripts\start-project-management.ps1
```

#### Terminal 5: Annotation QA Service (Port 3005)
```powershell
cd welo-platform
.\scripts\start-annotation-qa-service.ps1
```

---

### 3. Start Frontend (Optional)

```powershell
cd welo-platform-ui
npm run dev
```

Frontend runs on **http://localhost:5173**

---

## Service Ports

| Service               | Port | URL                      |
|-----------------------|------|--------------------------|
| Workflow Engine       | 3001 | http://localhost:3001    |
| Auth Service          | 3002 | http://localhost:3002    |
| Task Management       | 3003 | http://localhost:3003    |
| Project Management    | 3004 | http://localhost:3004    |
| Annotation QA Service | 3005 | http://localhost:3005    |
| Frontend (Vite)       | 5173 | http://localhost:5173    |

---

## Infrastructure Ports

| Service    | Port | Connection String                     |
|------------|------|---------------------------------------|
| PostgreSQL | 5432 | postgres://postgres:postgres@localhost:5432/welo_platform |
| Redis      | 6379 | redis://localhost:6379                |
| Kafka      | 9092 | localhost:9092                        |

---

## Development Workflow

### Making Code Changes

1. **Edit service code** in `apps/<service-name>/src/`
2. **NestJS watch mode automatically rebuilds** (hot reload)
3. **Service restarts automatically**
4. **Check terminal for errors**

### Advantages of This Setup

✅ **Faster rebuilds** (no Docker layer caching, direct TS compilation)  
✅ **Better debugging** (direct console output, easier breakpoints)  
✅ **Easy service restart** (Ctrl+C and re-run script)  
✅ **True hot reload** (NestJS watch mode)  
✅ **No volume mount delays** (Windows Docker volumes are slow)  

### Stopping Services

**Stop Node services:** Press `Ctrl+C` in each terminal

**Stop infrastructure:**
```powershell
docker compose -f docker-compose.infra.yml down
```

**Stop infrastructure and delete data:**
```powershell
docker compose -f docker-compose.infra.yml down -v
```

---

## Troubleshooting

### Port Already in Use
If you see `EADDRINUSE` errors, check for processes using the port:

```powershell
netstat -ano | findstr :3004
```

Kill the process:
```powershell
taskkill /PID <process-id> /F
```

### Database Connection Errors
Ensure Postgres is running and healthy:

```powershell
docker logs welo-postgres
docker exec -it welo-postgres pg_isready -U postgres
```

### Kafka Connection Errors
Check Kafka is ready:

```powershell
docker logs welo-kafka
```

Wait 30-40 seconds after `docker compose up` for Kafka to fully start.

### Missing Dependencies
Run in the service directory:

```powershell
npm install
```

---

## Alternative: Run Everything in Docker

If you prefer the old Docker setup (all services in containers):

```powershell
docker compose up -d
```

This uses the full `docker-compose.yml` with all services containerized.

---

## API Documentation

Once services are running, access Swagger docs:

- Workflow Engine: http://localhost:3001/api/docs
- Auth Service: http://localhost:3002/api/docs
- Task Management: http://localhost:3003/api/docs
- Project Management: http://localhost:3004/api/docs
- Annotation QA: http://localhost:3005/api/docs

---

## Next Steps

1. **Start infrastructure:** `docker compose -f docker-compose.infra.yml up -d`
2. **Run all 5 service scripts** in separate terminals
3. **Start frontend:** `npm run dev` in `welo-platform-ui/`
4. **Open browser:** http://localhost:5173
