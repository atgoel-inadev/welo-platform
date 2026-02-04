8.2 Phase 1 — Foundational Platform Capabilities 
Phase 1 (Foundations) delivers all P0 requirements. The objective of this phase is to provide a fully 
usable internal annotation platform that supports end‑to‑end task creation, processing, and delivery 
without engineering intervention. And allow WeloData to seamlessly transfer over all ongoing 
annotation work to the new platform 
Scope of Phase 1 (P0 Requirements) 
Phase 1 includes the following capabilities:	
Core Data Model & APIs 
• Workspace → Project → Batch → Task → Annotation hierarchy 
• CRUD APIs for all core objects 
• Support for flexible response schemas, including level‑dependent UI/schema behavior 
• Soft‑delete behavior for all objects 
Authentication & Access Control 
• Login and user profile management 
• Separation of internal (Ops, QA, Admin) and external (Rater) user experiences 
• Baseline RBAC enforcement 
• Okta SSO integration (OAuth2) 
Pipeline & Status System 
• Configurable multi‑layer pipelines (e.g., L1, L2, Review, Hold, Archive) 
• Annotation and task statuses aligned to the pipeline 
• Ops controls for manual movement (advance, hold, archive/ignore) 
Queueing, Assignment & Claiming 
• FIFO queueing based on upload time 
• Manual and automatic assignment 
• Deterministic claim‑locking with timeout/reclaim behavior 
Task UI 
• Rendering for all supported file types (text, markdown, HTML, audio, image, video) 
• Core response components (single/multi‑select, free text, multi‑turn interactions) 
• Dynamic UI behavior based on uploaded schema 
• Pipeline‑level UI differences (review vs annotation) 
• Ops‑managed UI configuration tooling (UI Builder) 
Rater Portal & Rater Management 
• Rater portal for queue access, submission, and status visibility 
Quality & Benchmarking 
• Configurable linter framework (blocking/warning) 
• Baseline time tracking for payout 
• Benchmarks (BMs) as a wall/gate at project start 
• Golden response saving for BM workflows 
Ops Tooling 
• Task/batch upload tooling with validation and progress indicators 
• Batch export (CSV/JSON + packaged asset links) 
• Reset/archive/ignore controls 
• Project cloning 
• Bulk task movement across projects 
Storage, Infra & Logging 
• Structured object storage (e.g., S3) 
• Signed URL pattern for file access 
• Modular backend + UI architecture 
• Baseline logging and audit trails (login, claims, transitions, submissions) 
Phase 1 establishes the entire internal workflow foundation required to fully operate annotation 
projects end‑to‑end.

8.3 Phase 2 — Workflow Expansion & Operationalization 
Phase 2 (Operational Expansion) delivers all P1 requirements. These capabilities enable scaled, 
multi‑project operations with stronger workforce management, auditability, and customer‑facing 
data access.	
Scope of Phase 2 (P1 Requirements) 
Authentication & Access 
• Role provisioning and environment‑consistent login flows 
Data Model 
• Project‑sets to group related projects for shared workflows 
• Hard‑delete functionality (where appropriate) 
Pipeline, Quality & Benchmarks 
• Benchmarks (BMs) interleaved in‑queue at configurable frequencies 
Queueing, Assignment & Workforce Management 
• Mass assignment based on rater levels 
• Project‑level assignment (in addition to batch‑level) 
• Send‑back‑to‑queue behavior (when raters reject items) 
• Load balancing across raters (min/max limits, daily distribution) 
Ops Tooling 
• Rater/Reviewer impersonation for troubleshooting (audited, secure session switching) 
Search, Parallelization & Infrastructure 
• Robust fuzzy search across users, projects, batches 
• Full support for multiple concurrent projects/batches (parallelization/isolation) 
Processing & Integrations 
• Pre‑processing and post‑processing hooks (e.g., AWS Lambda) configurable per project‑set 
Customer Portal (Phase 2 Features) 
• Customer Dashboard with contract usage and seat management 
• Customer‑side dataset upload (for Ops‑managed projects) 
• Customer download/export of completed datasets 
Phase 2 transforms the Phase 1 foundation into an operationally mature platform capable of 
supporting parallel teams, complex quality controls, and enterprise workflows.