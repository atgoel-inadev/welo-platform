# GitHub Copilot – Project Instructions

This repository contains the **Welo Data Annotation Platform**, an internal, end-to-end system for managing
data annotation workflows, queueing, task execution, quality control, and batch-level exports.

Copilot MUST strictly follow the architectural, design, and coding rules defined below.

---

## 1. Project Overview

The Welo Data Annotation Platform is a **configurable, scalable, monorepo-based microservices system**
that centralizes:

- Queueing and task orchestration
- Annotation workflows
- Annotation user interfaces
- Operational tooling
- Quality assurance processes
- Batch-level data export

The platform replaces fragmented tools and manual processes with a unified, configurable environment
that ensures **operational consistency across projects and customers**.

---

## 2. Technology Stack (MANDATORY)

Copilot MUST use the following technologies only:

### Backend
- **NestJS** (mandatory for all services)
- **TypeScript** (preferred) or **modern JavaScript**
- **TypeORM** for persistence
- **PostgreSQL** (assumed default unless specified)

### Workflow & State
- **XState** for:
  - Workflow definitions
  - Task lifecycle management
  - Approval flows
  - Quality review states
  - Batch processing states

### Architecture
- **Monorepo**
- **Microservices**
- **Domain-driven boundaries**
- **Event-driven communication (preferred over direct coupling)**

---

## 3. Monorepo Structure Rules

Copilot MUST follow this logical structure:

/apps
/api-gateway
/workflow-service
/annotation-service
/quality-service
/export-service

/libs
/domain
/workflow-engine
/persistence
/shared
/contracts

Rules:
- Each service is independently deployable
- Shared logic MUST live in `/libs`
- No circular dependencies between apps
- No business logic in controllers

---

## 4. Workflow & State Management Rules (XState)

- All workflows MUST be modeled using **XState**
- No ad-hoc status flags or enums for workflow logic
- Each workflow must:
  - Be data-driven
  - Support configuration per project
  - Persist state transitions
  - Emit audit events

Examples of valid workflows:
- Task lifecycle (Created → Assigned → Annotating → Review → Approved / Rejected)
- Quality control workflows
- Batch export workflows

---

## 5. Persistence Rules (TypeORM)

- Use **TypeORM Entities** only
- No raw SQL unless absolutely required
- Repositories MUST:
  - Encapsulate persistence logic
  - Never contain business logic
- Use migrations for schema changes
- All state transitions must be persisted and auditable

---

## 6. Clean Code Principles (MANDATORY)

Copilot MUST ensure:

- Small, single-purpose functions
- Descriptive naming (no abbreviations)
- No magic numbers or strings
- Explicit error handling
- No deeply nested conditionals
- Prefer composition over inheritance

Code should be readable without comments.

---

## 7. SOLID Principles (MANDATORY)

Copilot MUST enforce:

- **Single Responsibility**: One reason to change
- **Open/Closed**: Extend behavior, don’t modify core logic
- **Liskov Substitution**: Interfaces must be substitutable
- **Interface Segregation**: Small, focused interfaces
- **Dependency Inversion**: Depend on abstractions, not implementations

NestJS Dependency Injection MUST be used consistently.

---

## 8. GoF Design Patterns (USE WHERE APPLICABLE)

Copilot SHOULD prefer established patterns, including but not limited to:

- **Factory** – workflow creation, service instantiation
- **Strategy** – annotation rules, validation logic, scoring
- **State** – XState integration
- **Observer / Pub-Sub** – workflow events, audit logs
- **Command** – task actions (approve, reject, reassign)
- **Adapter** – external tools or legacy integrations
- **Facade** – API gateway orchestration

Patterns must be explicit and intentional.

---

## 9. Service Design Rules

- Controllers:
  - Handle HTTP only
  - No business logic
- Services:
  - Contain domain logic
  - Orchestrate workflows
- Domain Layer:
  - Pure business rules
  - No framework dependencies
- Infrastructure Layer:
  - Database, queues, external services

---

## 10. Quality, Audit & Observability

Copilot MUST:
- Log all workflow transitions
- Persist audit trails
- Emit domain events
- Keep quality decisions traceable
- Ensure batch-level traceability for exports

---

## 11. What Copilot MUST NOT Do

- Do NOT put logic in controllers
- Do NOT bypass XState for workflow logic
- Do NOT tightly couple services
- Do NOT duplicate domain logic across services
- Do NOT violate SOLID or Clean Code principles
- Do NOT introduce unnecessary frameworks

---

## 12. Default Assumptions

Unless explicitly stated otherwise:
- API style is REST
- Authentication is handled at gateway level
- Services communicate via events
- Configuration is data-driven
- Scalability and auditability are first-class concerns

---

## 13. Final Instruction

Copilot should behave as a **Senior Backend Architect** and generate **production-grade, maintainable, extensible code**
aligned with enterprise workflow platforms.

Shortcuts, hacks, or demo-style implementations are NOT acceptable.
