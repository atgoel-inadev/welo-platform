# Welo Data Annotation Platform - Microservices Architecture

## Overview
This document defines the microservices architecture for the Welo Data Annotation Platform, breaking down the monolithic domain into independently deployable, scalable services organized around business capabilities.

---

## Architecture Principles

1. **Domain-Driven Design**: Services aligned with bounded contexts
2. **Single Responsibility**: Each service owns a specific business capability
3. **Data Ownership**: Each service owns and manages its data
4. **API-First**: Well-defined REST APIs for inter-service communication
5. **Event-Driven**: Asynchronous communication via event bus
6. **Independent Deployment**: Services can be deployed independently
7. **Polyglot Persistence**: Each service chooses appropriate storage
8. **Resilience**: Circuit breakers, retries, graceful degradation

---

## Microservices Breakdown

### 1. Authentication & Authorization Service
**Responsibility**: User identity, authentication, authorization, and permission management

**Domain Entities**:
- User
- Role
- Permission
- Session
- RefreshToken

**Key Capabilities**:
- User registration and login
- JWT token generation and validation
- OAuth2/OIDC integration
- Role-based access control (RBAC)
- Permission checking
- Session management
- Password reset flows
- Multi-factor authentication (MFA)

**API Endpoints**:
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `POST /auth/register`
- `GET /auth/permissions`
- `POST /auth/verify-token`

**Database**: PostgreSQL
**Cache**: Redis (sessions, tokens)

**Events Published**:
- `user.registered`
- `user.logged_in`
- `user.logged_out`
- `password.reset`

---

### 2. Project Management Service
**Responsibility**: Project lifecycle, customer management, and project configuration

**Domain Entities**:
- Project
- Customer
- Template
- ProjectMember

**Key Capabilities**:
- Project CRUD operations
- Customer management
- Project configuration management
- Template management
- Project member assignments
- Project status transitions
- Project-level settings and defaults

**API Endpoints**:
- `GET/POST/PATCH/DELETE /projects`
- `GET/POST/PATCH/DELETE /customers`
- `GET/POST /templates`
- `POST /projects/{id}/members`

**Database**: PostgreSQL
**Cache**: Redis (project configs, templates)

**Events Published**:
- `project.created`
- `project.updated`
- `project.status_changed`
- `customer.created`

**Events Consumed**:
- `batch.completed` (update project stats)
- `task.completed` (update project progress)

---

### 3. Task Management Service
**Responsibility**: Task lifecycle, batch management, queue management, and task assignments

**Domain Entities**:
- Task
- Batch
- Queue
- Assignment

**Key Capabilities**:
- Task CRUD operations
- Bulk task creation
- Batch management
- Queue configuration and management
- Task assignment logic
- Task prioritization
- Assignment expiration handling
- Task routing and distribution

**API Endpoints**:
- `GET/POST/PATCH /tasks`
- `POST /tasks/bulk`
- `GET/POST/PATCH /batches`
- `GET/POST/PATCH /queues`
- `POST /tasks/{id}/assign`
- `GET /queues/{id}/next-task`
- `POST /assignments/{id}/release`

**Database**: PostgreSQL (with partitioning on created_at)
**Cache**: Redis (queue state, task counts)
**Message Queue**: RabbitMQ/Kafka (task assignments)

**Events Published**:
- `task.created`
- `task.assigned`
- `task.updated`
- `task.completed`
- `batch.created`
- `batch.completed`
- `assignment.expired`

**Events Consumed**:
- `annotation.submitted` (update task status)
- `quality_check.completed` (update task status)
- `state.transitioned` (sync task status)

---

### 4. Workflow Engine Service (XState)
**Responsibility**: Workflow definition, state machine execution, and state management

**Domain Entities**:
- Workflow
- WorkflowInstance
- StateTransition
- Actor (in-memory)

**Key Capabilities**:
- Workflow CRUD operations
- XState machine definition storage
- State machine compilation and caching
- Event processing and state transitions
- Guard evaluation
- Action execution
- Service invocation
- Actor lifecycle management (spawn, stop, pause)
- State persistence and snapshots
- Workflow visualization
- Workflow simulation
- Parallel and hierarchical state support

**API Endpoints**:
- `GET/POST/PATCH /workflows`
- `POST /workflows/{id}/validate`
- `POST /workflows/{id}/simulate`
- `GET /workflows/{id}/visualization`
- `POST /tasks/{id}/events`
- `GET /tasks/{id}/state`
- `GET /tasks/{id}/state-history`
- `POST /workflow-instances`
- `POST /workflow-instances/{id}/pause`
- `GET /state-transitions`

**Database**: PostgreSQL (workflow definitions, state transitions)
**In-Memory Store**: Redis (active actor states, compiled machines)
**Message Queue**: Kafka (event processing)
**Cache**: Redis (compiled state machines)

**Events Published**:
- `state.transitioned`
- `workflow.instance.started`
- `workflow.instance.completed`
- `workflow.instance.failed`
- `workflow.action.executed`

**Events Consumed**:
- `task.created` (initialize state machine)
- `annotation.submitted` (trigger state transition)
- `quality_check.completed` (trigger state transition)

**Special Considerations**:
- High-throughput event processing
- Actor registry for distributed systems
- State machine hot-reloading
- Delayed transitions (timers)

---

### 5. Annotation Service
**Responsibility**: Annotation data management and submission handling

**Domain Entities**:
- Annotation
- AnnotationVersion (for revision history)

**Key Capabilities**:
- Annotation submission
- Annotation retrieval
- Annotation versioning
- Annotation comparison
- Draft saving
- Annotation validation
- Confidence scoring
- Time tracking

**API Endpoints**:
- `POST /tasks/{id}/annotations`
- `GET /tasks/{id}/annotations`
- `PATCH /annotations/{id}`
- `POST /annotations/compare`
- `GET /annotations/{id}/history`

**Database**: PostgreSQL + JSON columns
**Object Storage**: S3/MinIO (large annotation payloads)
**Cache**: Redis (recent annotations)

**Events Published**:
- `annotation.submitted`
- `annotation.updated`
- `annotation.draft_saved`

**Events Consumed**:
- `task.assigned` (prepare annotation context)
- `quality_check.failed` (handle revision requests)

---

### 6. Quality Assurance Service
**Responsibility**: Quality checks, reviews, validation, and quality metrics

**Domain Entities**:
- QualityCheck
- QualityRule
- QualityMetrics

**Key Capabilities**:
- Manual quality reviews
- Automated quality checks
- Consensus resolution
- Quality scoring
- Issue tracking and categorization
- Feedback management
- Gold standard comparisons
- Quality metrics calculation
- Inter-annotator agreement

**API Endpoints**:
- `POST /tasks/{id}/quality-checks`
- `GET /quality-checks`
- `POST /batches/{id}/quality-checks/automated`
- `GET /projects/{id}/quality-metrics`
- `POST /quality-checks/{id}/resolve`

**Database**: PostgreSQL
**Analytics Store**: ClickHouse/TimescaleDB (metrics time-series)

**Events Published**:
- `quality_check.completed`
- `quality_check.passed`
- `quality_check.failed`
- `consensus.required`

**Events Consumed**:
- `annotation.submitted` (trigger quality checks)
- `task.completed` (calculate batch quality)

---

### 7. Export Service
**Responsibility**: Data export, format conversion, and file generation

**Domain Entities**:
- Export
- ExportJob
- ExportTemplate

**Key Capabilities**:
- Export request handling
- Data aggregation from multiple services
- Format conversion (JSON, JSONL, CSV, COCO, PASCAL_VOC)
- File compression
- Large file generation (streaming)
- Export scheduling
- Export expiration management
- Incremental exports
- Data anonymization

**API Endpoints**:
- `POST /batches/{id}/exports`
- `GET /exports/{id}`
- `GET /exports/{id}/download`
- `GET /exports`

**Database**: PostgreSQL (export metadata)
**Object Storage**: S3/MinIO (export files)
**Message Queue**: RabbitMQ (async export jobs)
**Worker Pool**: Celery/Bull (export processing)

**Events Published**:
- `export.started`
- `export.completed`
- `export.failed`
- `export.expired`

**Events Consumed**:
- `batch.completed` (trigger auto-export)

---

### 8. Notification Service
**Responsibility**: User notifications, alerts, and webhook management

**Domain Entities**:
- Notification
- NotificationPreference
- Webhook
- WebhookDelivery

**Key Capabilities**:
- In-app notifications
- Email notifications
- SMS notifications (optional)
- Push notifications (optional)
- Webhook delivery
- Webhook retry logic
- Notification preferences management
- Notification batching
- Real-time notification delivery (WebSocket)

**API Endpoints**:
- `GET /notifications`
- `POST /notifications/{id}/read`
- `POST /notifications/read-all`
- `GET/POST/DELETE /webhooks`
- `GET /webhooks/{id}/deliveries`

**Database**: PostgreSQL
**Message Queue**: RabbitMQ/Kafka (notification events)
**Real-time**: WebSocket server / Socket.io
**Email Service**: SendGrid/SES
**SMS Service**: Twilio (optional)

**Events Published**:
- `notification.sent`
- `webhook.delivered`
- `webhook.failed`

**Events Consumed**:
- ALL major events (task.assigned, batch.completed, etc.)

---

### 9. Analytics & Reporting Service
**Responsibility**: Metrics aggregation, dashboard data, and report generation

**Domain Entities**:
- Metric
- Dashboard
- Report
- KPI

**Key Capabilities**:
- Real-time metrics calculation
- Historical data aggregation
- Dashboard data preparation
- Custom report generation
- User performance analytics
- Project progress tracking
- Quality trend analysis
- Productivity metrics
- Capacity planning data

**API Endpoints**:
- `GET /analytics/dashboard`
- `GET /analytics/projects/{id}/progress`
- `GET /analytics/productivity`
- `GET /analytics/quality-trends`
- `GET /analytics/transitions`
- `POST /reports/generate`

**Database**: PostgreSQL (metadata)
**Analytics Store**: ClickHouse/TimescaleDB (time-series metrics)
**OLAP**: Apache Druid (optional, for complex queries)
**Cache**: Redis (dashboard data)

**Events Consumed**:
- ALL events (for metric aggregation)

---

### 10. Audit Service
**Responsibility**: Audit logging, compliance tracking, and activity monitoring

**Domain Entities**:
- AuditLog
- ComplianceRecord

**Key Capabilities**:
- Comprehensive activity logging
- Change tracking
- Compliance reporting
- Data retention management
- Audit trail queries
- Security event monitoring
- GDPR compliance support

**API Endpoints**:
- `GET /audit-logs`
- `GET /audit-logs/entity/{type}/{id}`
- `GET /compliance/report`

**Database**: PostgreSQL (with partitioning)
**Log Store**: Elasticsearch (searchable logs)
**Archive**: S3/Glacier (long-term retention)

**Events Consumed**:
- ALL events (for comprehensive audit trail)

---

### 11. File Storage Service
**Responsibility**: File upload, storage, retrieval, and media processing

**Domain Entities**:
- File
- FileMetadata
- PresignedUrl

**Key Capabilities**:
- File upload (multipart)
- File download
- Presigned URL generation
- Image/video thumbnails
- File virus scanning
- CDN integration
- File lifecycle management
- Storage quota management

**API Endpoints**:
- `POST /files/upload`
- `GET /files/{id}`
- `GET /files/{id}/download`
- `POST /files/presigned-url`
- `DELETE /files/{id}`

**Object Storage**: S3/MinIO/Azure Blob
**CDN**: CloudFront/Cloudflare
**Database**: PostgreSQL (metadata)
**Image Processing**: Sharp/ImageMagick

**Events Published**:
- `file.uploaded`
- `file.processed`
- `file.deleted`

---

### 12. Comment & Collaboration Service
**Responsibility**: Comments, discussions, and collaboration features

**Domain Entities**:
- Comment
- Thread
- Mention

**Key Capabilities**:
- Comment CRUD operations
- Threaded discussions
- @mentions and notifications
- Comment resolution
- Attachment support
- Real-time comment updates

**API Endpoints**:
- `GET/POST/PATCH/DELETE /comments`
- `POST /comments/{id}/resolve`
- `GET /comments?entity_type=TASK&entity_id=uuid`

**Database**: PostgreSQL
**Real-time**: WebSocket/Socket.io
**Search**: Elasticsearch (comment search)

**Events Published**:
- `comment.created`
- `comment.resolved`
- `user.mentioned`

**Events Consumed**:
- `comment.created` (trigger mention notifications)

---

## Service Communication Patterns

### Synchronous Communication (REST)
Used for:
- Direct queries (read operations)
- Immediate consistency requirements
- Request-response patterns

**Examples**:
- Task Management → Workflow Engine (get current state)
- Annotation Service → Task Management (get task details)
- API Gateway → All services

**Implementation**: 
- REST over HTTP/HTTPS
- Service discovery (Consul/Eureka)
- Load balancing
- Circuit breakers (Hystrix/Resilience4j)

### Asynchronous Communication (Events)
Used for:
- Eventual consistency
- Cross-service workflows
- Event-driven processes
- High throughput

**Examples**:
- Task Management → Workflow Engine (task.created event)
- Annotation Service → Quality Assurance (annotation.submitted event)
- All services → Audit Service

**Implementation**:
- Event bus: Apache Kafka / RabbitMQ
- Event schema registry (Avro/Protobuf)
- Dead letter queues
- Event replay capability

---

## Data Management Strategy

### Database per Service
Each service owns its data:

| Service | Primary Database | Cache | Additional Storage |
|---------|-----------------|-------|-------------------|
| Auth Service | PostgreSQL | Redis | - |
| Project Management | PostgreSQL | Redis | - |
| Task Management | PostgreSQL (partitioned) | Redis | - |
| Workflow Engine | PostgreSQL | Redis (actors) | - |
| Annotation | PostgreSQL | Redis | S3 (large payloads) |
| Quality Assurance | PostgreSQL | - | ClickHouse (metrics) |
| Export | PostgreSQL | - | S3 (files) |
| Notification | PostgreSQL | Redis | - |
| Analytics | PostgreSQL | Redis | ClickHouse |
| Audit | PostgreSQL (partitioned) | - | Elasticsearch, S3 |
| File Storage | PostgreSQL (metadata) | - | S3/MinIO |
| Comment | PostgreSQL | - | - |

### Data Consistency Patterns

**1. Saga Pattern** (for distributed transactions)
- Used for: Task assignment + workflow state initialization + notification
- Choreography-based or orchestration-based

**2. Event Sourcing** (optional)
- Used for: Workflow Engine (state transitions)
- Audit Service (complete event history)

**3. CQRS** (Command Query Responsibility Segregation)
- Used for: Analytics Service (read models optimized for queries)

**4. Data Replication**
- Read replicas for reporting services
- Analytics store receives denormalized data

---

## API Gateway

**Responsibility**: Single entry point, routing, authentication, rate limiting

**Capabilities**:
- Request routing to microservices
- Authentication token validation (calls Auth Service)
- Rate limiting
- Request/response transformation
- API versioning
- CORS handling
- Request logging
- Circuit breaking
- Load balancing

**Technology**: Kong / NGINX / AWS API Gateway / Traefik

**Endpoints**:
- All client requests go through gateway
- Gateway routes to appropriate service
- Internal service-to-service calls bypass gateway

---

## Service Dependencies

```
┌─────────────────────────────────────────────────────────┐
│                      API Gateway                        │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│     Auth     │  │   Project    │  │     Task     │
│   Service    │  │  Management  │  │  Management  │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        │                 │                 ▼
        │                 │         ┌──────────────┐
        │                 │         │   Workflow   │
        │                 │         │    Engine    │
        │                 │         └──────────────┘
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Annotation  │  │   Quality    │  │    Export    │
│   Service    │  │  Assurance   │  │   Service    │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ▼
                ┌──────────────┐
                │ Notification │
                │   Service    │
                └──────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Analytics   │  │    Audit     │  │     File     │
│   Service    │  │   Service    │  │   Storage    │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Deployment Architecture

### Container Orchestration
- **Kubernetes** for container orchestration
- Each service deployed as a separate deployment
- Horizontal pod autoscaling based on CPU/memory
- Health checks and readiness probes

### Service Mesh (Optional)
- **Istio / Linkerd** for service-to-service communication
- mTLS between services
- Distributed tracing
- Traffic management

### CI/CD Pipeline
- Independent pipelines per service
- Automated testing (unit, integration, e2e)
- Canary deployments
- Blue-green deployments

---

## Observability

### Monitoring
- **Prometheus** + **Grafana** for metrics
- Service-level metrics (latency, throughput, error rate)
- Business metrics (tasks completed, quality scores)

### Logging
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- Centralized logging
- Structured logs (JSON)
- Correlation IDs for request tracing

### Distributed Tracing
- **Jaeger / Zipkin**
- Trace requests across services
- Performance bottleneck identification

### Alerting
- **Alertmanager**
- Service health alerts
- SLA breach alerts
- Business metric alerts

---

## Security Considerations

### Authentication & Authorization
- JWT tokens for authentication
- Service-to-service authentication via mTLS or API keys
- Role-based access control (RBAC)

### Network Security
- Private network for service-to-service communication
- API Gateway as the only public entry point
- Network policies in Kubernetes

### Data Security
- Encryption at rest (database encryption)
- Encryption in transit (TLS)
- Secrets management (Vault / Kubernetes Secrets)
- PII anonymization in logs

---

## Scalability Strategy

### Horizontal Scaling
- Stateless services scale horizontally
- Auto-scaling based on metrics

### Service-Specific Scaling
- **Workflow Engine**: Scale based on event queue depth
- **Export Service**: Scale workers based on export queue
- **Task Management**: Scale based on queue size
- **Analytics**: Read replicas for queries

### Database Scaling
- Read replicas for read-heavy services
- Database sharding for large datasets
- Connection pooling (PgBouncer)

---

## Migration Strategy (Monolith to Microservices)

### Phase 1: Strangler Pattern
1. Start with **Auth Service** (extract first)
2. Then **File Storage Service**
3. Then **Notification Service**
4. Keep monolith for core business logic

### Phase 2: Core Services
1. Extract **Project Management**
2. Extract **Task Management**
3. Extract **Workflow Engine** (most complex)

### Phase 3: Domain Services
1. Extract **Annotation Service**
2. Extract **Quality Assurance**
3. Extract **Export Service**

### Phase 4: Support Services
1. Extract **Analytics**
2. Extract **Audit**
3. Extract **Comment Service**

---

## Technology Stack Recommendations

### Backend Services
- **Language**: Python (FastAPI/Flask) or Node.js (NestJS) or Java (Spring Boot)
- **API Framework**: FastAPI, Express, Spring Boot
- **ORM**: SQLAlchemy, Prisma, Hibernate

### Databases
- **Relational**: PostgreSQL
- **Cache**: Redis
- **Analytics**: ClickHouse / TimescaleDB
- **Search**: Elasticsearch

### Message Broker
- **Primary**: Apache Kafka (for events)
- **Secondary**: RabbitMQ (for task queues)

### Storage
- **Object Storage**: MinIO / S3
- **CDN**: CloudFront / Cloudflare

### Infrastructure
- **Container**: Docker
- **Orchestration**: Kubernetes
- **Service Mesh**: Istio (optional)
- **API Gateway**: Kong / Traefik

### Observability
- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack
- **Tracing**: Jaeger
- **APM**: New Relic / DataDog (optional)

---

## Conclusion

This microservices architecture provides:
- ✅ **Scalability**: Each service scales independently
- ✅ **Resilience**: Failure isolation between services
- ✅ **Flexibility**: Technology choices per service
- ✅ **Team Autonomy**: Teams own specific services
- ✅ **Deployment Independence**: Deploy services separately
- ✅ **XState Integration**: Dedicated Workflow Engine service
- ✅ **Event-Driven**: Reactive, loosely coupled services
- ✅ **Observability**: Comprehensive monitoring and tracing
