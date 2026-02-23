# Welo Platform — Local Development Setup

Everything a new team member needs to get the full stack running locally and
connect the Netlify-deployed frontend to it via a free Cloudflare tunnel.

---

## Architecture Overview

```
[Netlify — React SPA]
       │  HTTPS API calls
       ▼
[Cloudflare Quick Tunnel  *.trycloudflare.com]  (free, no account)
       │
       ▼
[Docker: Nginx :80 — API Gateway]
       ├── /auth/*           → auth-service:3002
       ├── /tasks/*          → task-management:3003
       ├── /projects/*       → project-management:3004
       ├── /workflows/*      → workflow-engine:3001
       └── /annotation-qa/* → annotation-qa-service:3005

Supporting infrastructure (all Docker):
  PostgreSQL :5432   Redis :6379   Kafka :9092
```

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Docker Desktop | 4.x+ | https://www.docker.com/products/docker-desktop |
| Node.js | 20 LTS | https://nodejs.org |
| Git | any | https://git-scm.com |
| Netlify CLI | optional | `npm i -g netlify-cli` |

---

## 1 — Clone the Repositories

```bash
# Backend (this repo)
git clone <welo-platform-repo-url> welo-platform
cd welo-platform

# Frontend (separate repo, sibling directory)
git clone <welo-platform-ui-repo-url> welo-platform-ui
```

The two directories must be **siblings** because `docker-compose.yml` mounts
`../welo-platform-ui/public/uploads` as a volume for the project-management
service.

---

## 2 — Start the Backend

```bash
cd welo-platform
docker-compose up -d --build
```

First run takes 3–5 minutes to build all images. Subsequent starts are fast.

PostgreSQL automatically executes every `docker/postgres/init/*.sql` file in
alphabetical order (`01-schema.sql` → `09-team-collaboration.sql`), so the
database is fully seeded—no manual steps needed.

### Verify all services are healthy

```bash
docker-compose ps
```

Expected state: every container shows `healthy` or `running`.

```bash
# Quick health check for the gateway
curl http://localhost/health
# → {"status":"ok","gateway":"nginx"}

# Check the auth service through the gateway
curl http://localhost/auth/api/v1/health
# → {"status":"ok","service":"auth-service"}
```

---

## 3 — Get the Cloudflare Tunnel URL

The `cloudflared` container creates a free public HTTPS URL automatically.
It changes every time the container restarts.

```bash
docker-compose logs cloudflared 2>&1 | grep -o 'https://[^ ]*trycloudflare\.com'
```

Example output:
```
https://salmon-umbrella-abc123.trycloudflare.com
```

Keep this URL handy — you will need it in Step 5.

---

## 4 — Run the Frontend Locally (optional)

For local-only development, the frontend can point directly to the Docker
services on localhost ports:

```bash
cd welo-platform-ui

# Copy the example env file (already contains localhost defaults)
cp .env.example .env

npm install
npm run dev
# → App running at http://localhost:5173
```

The `.env` defaults work out of the box — no changes needed for local dev.

---

## 5 — Connect Netlify to the Cloudflare Tunnel

The React app deployed to Netlify cannot reach `localhost`. Instead it calls
the services through the Cloudflare tunnel URL.

### 5a — Set Netlify environment variables

Go to **Netlify → your site → Site configuration → Environment variables** and
set these five variables using your tunnel URL from Step 3:

| Variable | Value |
|---|---|
| `VITE_AUTH_SERVICE_URL` | `https://YOUR-TUNNEL/auth/api/v1` |
| `VITE_TASK_MANAGEMENT_URL` | `https://YOUR-TUNNEL/tasks/api/v1` |
| `VITE_PROJECT_MANAGEMENT_URL` | `https://YOUR-TUNNEL/projects/api/v1` |
| `VITE_WORKFLOW_ENGINE_URL` | `https://YOUR-TUNNEL/workflows/api/v1` |
| `VITE_ANNOTATION_QA_URL` | `https://YOUR-TUNNEL/annotation-qa/api/v1` |

### 5b — Trigger a new Netlify deploy

Because Vite embeds env vars at **build time**, you must redeploy after
changing them:

```
Netlify → Deploys → Trigger deploy → Deploy site
```

> **Tunnel URL changes on every container restart.**
> Whenever you run `docker-compose down && docker-compose up`, the URL changes
> and you must update the five Netlify env vars and redeploy.

### 5c — Deploy your own Netlify site (first-time only)

If you haven't deployed yet:

```bash
cd welo-platform-ui
npm run build           # produces dist/
netlify deploy --prod --dir dist --create-site "welo-platform"
```

Or connect the repository via the Netlify web UI (Import from Git).
The `netlify.toml` at the repo root configures the build automatically.

---

## 6 — User Credentials

All users are defined in `apps/auth-service/src/auth/mock-users.json`.

### Role summary

| Role | Email pattern | Password |
|---|---|---|
| Admin | admin@welo.com | `admin123` |
| Project Manager | pm1@welo.com, pm2@welo.com | `pm1234` |
| Reviewer | reviewer1–5@welo.com | `reviewer123` |
| Annotator | annotator1–15@welo.com | `annotator123` |

### Full user list

| # | Email | Password | Full Name | UUID suffix |
|---|---|---|---|---|
| 1 | admin@welo.com | admin123 | System Administrator | …440001 |
| 2 | pm1@welo.com | pm1234 | Alice Johnson | …440002 |
| 3 | annotator1@welo.com | annotator123 | Bob Smith | …440003 |
| 4 | annotator2@welo.com | annotator123 | Carol Davis | …440004 |
| 5 | reviewer1@welo.com | reviewer123 | David Wilson | …440005 |
| 6 | reviewer2@welo.com | reviewer123 | Eve Reviewer | …440006 |
| 7 | pm2@welo.com | pm1234 | Frank Morgan | …440007 |
| 8 | annotator3@welo.com | annotator123 | Grace Lee | …440008 |
| 9 | annotator4@welo.com | annotator123 | Henry Park | …440009 |
| 10 | annotator5@welo.com | annotator123 | Iris Chen | …440010 |
| 11 | annotator6@welo.com | annotator123 | Jack Taylor | …440011 |
| 12 | annotator7@welo.com | annotator123 | Karen White | …440012 |
| 13 | annotator8@welo.com | annotator123 | Liam Brown | …440013 |
| 14 | annotator9@welo.com | annotator123 | Maya Rodriguez | …440014 |
| 15 | annotator10@welo.com | annotator123 | Noah Williams | …440015 |
| 16 | annotator11@welo.com | annotator123 | Olivia Martinez | …440016 |
| 17 | annotator12@welo.com | annotator123 | Paul Thompson | …440017 |
| 18 | annotator13@welo.com | annotator123 | Quinn Adams | …440018 |
| 19 | annotator14@welo.com | annotator123 | Rachel Garcia | …440019 |
| 20 | annotator15@welo.com | annotator123 | Sam Mitchell | …440020 |
| 21 | reviewer3@welo.com | reviewer123 | Tara Collins | …440021 |
| 22 | reviewer4@welo.com | reviewer123 | Uma Patel | …440022 |
| 23 | reviewer5@welo.com | reviewer123 | Victor Santos | …440023 |

Full UUIDs follow the pattern `650e8400-e29b-41d4-a716-44665544XXXX`.

---

## 7 — Seeded Projects

Seven projects are pre-configured with annotation questions and team members:

| # | Name | Type | Annotators | Reviewers | Questions | Plugins |
|---|---|---|---|---|---|---|
| 1 | Sentiment Analysis Dataset | TEXT | 4 | 3 | 0* | 0 |
| 2 | Image Classification Project | IMAGE | 4 | 3 | 0* | 0 |
| 3 | Customer Sentiment Analysis | TEXT | 5 | 2 | 10 | 2 |
| 4 | Medical Image Analysis | IMAGE | 4 | 2 | 10 | 0 |
| 5 | Podcast Transcription | AUDIO | 4 | 2 | 10 | 0 |
| 6 | Content Safety Review | VIDEO | 4 | 2 | 10 | 0 |
| 7 | Data Quality Assessment | CSV | 4 | 2 | 10 | 1 |

\* Projects 1 & 2 use the legacy `annotationSchema` configuration; annotation
questions can be added via the Edit Project UI.

Projects 3 and 7 have **demo plugins** pre-deployed so you can test the Plugin
Management feature immediately after setup.

---

## 8 — Database Access (direct)

```bash
# Connect to PostgreSQL inside Docker
docker exec -it welo-postgres psql -U postgres -d welo_platform

# Useful queries
\dt                          -- list all tables
SELECT COUNT(*) FROM users;  -- verify user count (expect 23)
SELECT COUNT(*) FROM tasks;  -- verify task count

-- View projects with their plugin count
SELECT name, project_type,
  jsonb_array_length(COALESCE(configuration->'plugins','[]'::jsonb)) AS plugins
FROM projects ORDER BY created_at;
```

---

## 9 — Service Ports (direct access, bypassing gateway)

| Service | Port | Base URL |
|---|---|---|
| Nginx API Gateway | 80 | `http://localhost/` |
| Auth Service | 3002 | `http://localhost:3002/api/v1` |
| Task Management | 3003 | `http://localhost:3003/api/v1` |
| Project Management | 3004 | `http://localhost:3004/api/v1` |
| Workflow Engine | 3001 | `http://localhost:3001/api/v1` |
| Annotation QA | 3005 | `http://localhost:3005/api/v1` |
| PostgreSQL | 5432 | `postgres://postgres:postgres@localhost:5432/welo_platform` |
| Redis | 6379 | `redis://localhost:6379` |
| Kafka | 9092 | `localhost:9092` |

---

## 10 — Common Operations

### Rebuild a single service after code changes

```bash
docker-compose up -d --build workflow-engine
```

### View logs for a service

```bash
docker-compose logs -f auth-service
docker-compose logs -f cloudflared   # includes the tunnel URL
```

### Reset the database (wipe all data and re-seed)

```bash
docker-compose down -v          # stops containers AND removes volumes
docker-compose up -d --build    # recreates everything from scratch
```

### Run the frontend dev server against local Docker

```bash
cd welo-platform-ui
# .env already contains localhost:PORT defaults — just run:
npm run dev
```

### Stop everything

```bash
docker-compose down             # stops containers, keeps volumes
docker-compose down -v          # stops containers, wipes volumes (full reset)
```

---

## 11 — Init SQL File Reference

| File | Contents |
|---|---|
| `01-schema.sql` | All table definitions, indexes, triggers |
| `02-seed.sql` | 3 customers, 6 users, 2 workflows, 2 projects, initial tasks |
| `03-annotation-qa-schema.sql` | Gold tasks, annotation versions, quality rules |
| `04-time-tracking.sql` | Time-spent column on review_approvals |
| `05-add-deleted-at.sql` | Soft-delete `deleted_at` on 12 tables |
| `06-extended-seed.sql` | 17 more users, 5 more projects (TEXT/IMAGE/AUDIO/VIDEO/CSV), 50 QUEUED tasks |
| `07-members-and-questions.sql` | Project team assignments + annotation questions (10 per project) |
| `08-plugin-tables.sql` | `plugin_secrets` and `plugin_execution_logs` tables |
| `09-team-collaboration.sql` | Reconciles DB with mock-users.json, adds sample plugins, prints credential summary |

---

## 12 — Troubleshooting

### "Service unhealthy" on startup

Services depend on Postgres/Redis/Kafka being healthy first. Wait 60–90 s for
all health checks to pass.  Check the lagging service:

```bash
docker-compose logs postgres
docker-compose logs kafka
```

### Nginx returns 502

The upstream microservice hasn't started yet. Check:

```bash
docker-compose ps           # confirm all services show "healthy"
docker-compose logs nginx
```

### Cloudflare tunnel URL not appearing in logs

```bash
docker-compose logs cloudflared
```

If you see `failed to connect`, wait 30 s and retry — the tunnel needs nginx
to be healthy first. If the problem persists, restart only cloudflared:

```bash
docker-compose restart cloudflared
```

### Netlify shows blank page or 404

- Confirm `public/_redirects` contains `/*  /index.html  200`
- Confirm the `netlify.toml` `publish` is `dist`
- After changing environment variables, you must **trigger a new deploy**
  (Netlify → Deploys → Trigger deploy)

### Annotation task doesn't load media

The project-management service reads files from `../welo-platform-ui/public/uploads`
(mounted read-only as `/app/media`). Ensure:
1. The `welo-platform-ui` repo is cloned as a sibling of `welo-platform`
2. Uploaded files are committed or manually placed in that directory

### Plugin execution fails with "Script error"

The SCRIPT sandbox provides: `Math`, `JSON`, `Date`, `String`, `Number`,
`Array`, `Object`, `RegExp`. Network calls, `require`, `import`, and `process`
are **not** available in SCRIPT plugins. Use an API plugin for external calls.

---

## 13 — Environment Variables Reference

### Backend services (docker-compose.yml)

| Variable | Used by | Description |
|---|---|---|
| `DATABASE_HOST` / `POSTGRES_HOST` | all | `postgres` (Docker service name) |
| `REDIS_HOST` | all | `redis` |
| `KAFKA_BROKERS` | all | `kafka:9092` |
| `JWT_SECRET` | auth-service | Change in production |
| `PLUGIN_SECRETS_KEY` | task-mgmt, project-mgmt | 64-char hex AES-256 key |

### Frontend (welo-platform-ui/.env)

| Variable | Local default | Netlify (tunnel) |
|---|---|---|
| `VITE_AUTH_SERVICE_URL` | `http://localhost:3002/api/v1` | `https://TUNNEL/auth/api/v1` |
| `VITE_TASK_MANAGEMENT_URL` | `http://localhost:3003/api/v1` | `https://TUNNEL/tasks/api/v1` |
| `VITE_PROJECT_MANAGEMENT_URL` | `http://localhost:3004/api/v1` | `https://TUNNEL/projects/api/v1` |
| `VITE_WORKFLOW_ENGINE_URL` | `http://localhost:3001/api/v1` | `https://TUNNEL/workflows/api/v1` |
| `VITE_ANNOTATION_QA_URL` | `http://localhost:3005/api/v1` | `https://TUNNEL/annotation-qa/api/v1` |
