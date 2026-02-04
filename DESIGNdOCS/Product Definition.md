 Product Definition  
2.1 What the Platform Is 
The platform provides a structured, multi‑layer annotation and review environment that includes:	
• Configurable pipelines and workflow stages 
• Schema‑driven task UIs supporting multiple data types 
• FIFO queueing, assignment, and claim locking 
• Rater and reviewer task interfaces for completing and validating annotations 
• Operational tools for task upload, export, tagging, and pipeline management 
• Benchmarks, consensus mechanisms, linters, and time‑tracking 
• Secure storage, access control, and audit logging 
• Support for high‑volume, multi‑project operations through the Workspace → Project → 
Batch → Task → Annotation hierarchy 
Customer‑facing capabilities include:	
• Organization‑level account and subscription management: Customer Admins can add or 
remove user seats and view usage summaries (e.g., annotation volume). 
• Dataset access and export: Customers can securely upload data (for Ops Managers to 
manage) and download/export completed datasets associated with their projects. 
• API key viewability: Customer Admins can view their API keys 
These customer capabilities focus on account and data access — not project setup or operational 
configuration.	
2.2 What the Platform Is Not 
Unless explicitly included in the SOW, the platform does not provide: 
• Customer‑facing project creation, workflow configuration, or operational tooling, 
including the ability to create projects, define pipelines, manage batches, upload tasks 
directly, or operate queueing/assignment settings. 
• End‑to‑end analytics or advanced reporting dashboards 
• Automated pre‑/post‑processing or ML‑driven prediction workflows 
• Deep integrations with internal systems not specified here 
• Phase 3 optional capabilities, such as drafts/autosave, advanced filters, custom grading, 
notification center, additional assignment strategies, and related enhancements 
Customer-facing account controls (user seats, dataset export, API credential management) are 
explicitly limited to access and data, and do not grant visibility into or control over internal project 
configuration or operational workflows. 
The table below clarifies the distinction between Customer-facing account and data-access 
capabilities and the internal Welo Data‑only operational and project‑management capabilities.	
 
Customer vs. Internal Capabilities 
Area Customer Capabilities Internal (Welo Data) Capabilities 
Account & Access 
Management 
• Manage organization‑level 
subscription and user seats 
(add/remove users) 	
• View their API keys 
• Provision internal roles (Ops, QA, 
Admin) 	
• Configure access boundaries and 
permission models 
Data & 
Deliverables 
• Download/export completed 
datasets	
• Manage export configurations, 
batch structures, delivery schemas 	
• Validate, audit, and re‑export data 
Usage Visibility • View high‑level consumption 
metrics (e.g., annotation volume) 
• Full operational status visibility 
(pipeline status, task progress, rater 
activity, quality signals) 
Project & 
Workflow Control 
Not available. Customers cannot 
create projects, configure pipelines, 
manage batches, upload tasks, or 
operate workflow tools. 
• Create and configure Workspaces, 
Projects, Batches 	
• Define pipelines, schemas, 
assignment strategies 	
• Upload task data and manage task 
lifecycle 
Operational Tools 
Not available. Customers do not 
have access to queueing, 
assignment, tagging, benchmarks, 
consensus, or Ops UI. 
• Ops Portal: task upload, tagging, 
reset/archive, pipeline controls, 
export generation 
Rater/Reviewer 
Operations 
Not available. Customers do not 
interact with internal rater or QA 
tools. 
• Full rater and reviewer interfaces, 
QA workflows, 
consensus/benchmark controls 
System 
Integrations 
• Use approved APIs for data 
submission and results retrieval 
• Build and maintain integrations 
with Okta, Datadog, AWS suite, 
monitoring, internal engineering 
systems 
Security & 
Compliance 
• Secure access to their own data 
and API credentials 
• Enforce encryption standards, audit 
logs, retention policies, PII handling, 
compliance controls 
 
3. Users & Core Workflows 
3.1 Personas (In order of Priority ) 
• Ops Manager / Project Lead / Internal User: configures projects, uploads tasks, assigns 
raters, advances pipeline stages, exports results. 
• Annotator (Rater): claims or receives assignments, completes tasks in the task UI, views 
benchmark / feedback where enabled. 
• Reviewer / QA: reviews annotations at higher layers, provides approvals or rejections, 
triggers workflow outcomes. 
• Product Admin: manages internal vs external access boundaries, user accounts, and 
platform configuration. 
• Customer / Client Admin: has visibility into the task statuses and can export results, 
optionally connect an API to import/export. 
• Engineering / DevOps: maintains infrastructure, CI/CD, and monitoring. 
3.2 Key User Journeys 
User Journeys in this section reflect the end‑to‑end interactions of each platform persona. Journeys 
or individual steps that include an explicit phase label—(Phase 2) or (Phase 3)—represent capabilities 
delivered beyond the Phase 1. All items without a phase label are delivered as part of Phase 1. This 
notation is intended to clarify scope boundaries and align user workflows with the phased 
requirements defined in Section 8. 
Ops Manager / Project Lead: 
1. Project Setup & Launch: The Ops Manager configures and launches a new labeling project 
based on customer requirements, enabling complex workflows to be setup and launched 
without engineering involvement. 
a. Journey: 
i. 
Create project  
ii. 
iii. 
Define multi-stage pipeline (e.g., L1 → Review → Audit → Done → Delivered)  
Configure stage-specific modular task UIs  
iv. Assign annotators and reviewers by role, tags, and/or level [Phase 2] 
v. Configure quality gates (benchmarks, agreement % thresholds, review 
routing) 
vi. Select pre- and post-processing options [Phase 2] 
vii. Upload batch of task data in bulk via UI  
2. Complex & Role Based Reviews: The Ops Manager configures different task UIs and 
schemas per pipeline stage so that annotators, reviewers, and auditors see only role
appropriate information. 
b. Journey: 
i. 
Configure annotator-only fields (fields that will not be visible in the review 
stage) 
ii. 
iii. 
Add review-only sections (fields that will only be visible to reviewers) 
Define shared fields that persist across stages (visible to all) 
3. Task Assignment & Serving: The Ops Manager assigns annotators and reviews to projects 
in order to serve tasks and to control workload distribution and respond to operational 
needs at scale. 
c. 
Option to preform action: 
i. Ops manager bulk assign raters on a project, batch, and/or pipeline-stage 
basis  
ii. 
Manual assignment or reassignment on individual tasks basis 
4. Dynamic Workflows & mid-project Changes: The Ops Manager adapts workflows mid
project to accommodate changing customer requirements without disrupting production. 
d. Journey: 
i. 
ii. 
iii. 
Clone project configurations within a project-set (defined project grouping) 
Modify UI schemas, pipelines, and/or quality rules in the new project 
1. UI/pipeline modifications 
2. Quality	rules	(benchmarks,	consensus,	linters) 
Move	selected	tasks	between	projects	 
5. Golden task/benchmark creation: The Ops Manager creates and manages golden tasks 
and benchmarks to measure and enforce rater quality throughout the pipeline. 
e. Journey: 
i. Workflow A: Pre-Labeled Golden Tasks [Phase 2] 
1. Tasks are uploaded with responses pre-populated [Phase 2] 
2. Tasks are flagged as Golden at upload time [Phase 2] 
3. Golden tasks are injected at a configurable rate [Phase 2] 
ii. 
Workflow B: Post-Creation Golden Tasks  
1. Standard tasks are uploaded 
2. Project leads annotate selected tasks 
3. Responses are marked as Golden post hoc  
6. Visibility: The Ops Manager monitors project progress and exports results to support 
delivery tracking, quality analysis, and customer reporting 
a. Journey: 
i. Track tasks and annotations statuses across project-sets within the platform 
ii. 
Filter tasks by status, tags, rater, and/or pipeline stage 
1. Standard filtering [Phase 2] 
2. Advanced/custom	filtering	[Phase 3] 
iii. 
Then export results as CSV or JSON, including associated assets [Phase 2] 
7. Configurable Quality Linters: The Ops Manager configures programmatic quality linters to 
automatically validate task responses and enforce quality standards during task submission 
and review. 
a. Journey:  
i. Select which linters apply per project  
ii. Configure linter behavior (blocking vs warning)  
iii. Tune linter for specific project (defined withing the linter build) 
iv. Optionally surface linter feedback to raters 
v. Store linter results linked to user and annotation 
Other Internal Users (e.g., Ops/Customer Engineering): 
1. Data processing:  
a. Journey	[Phase 2] 
i. 
Engineers	create	custom	pre-processing	scripts	in	AWS	Lambda	to	convert	
customer	data	input	into	the	[new	platform]	task	upload	format.	[Phase	2] 
ii. 
iii. 
Engineers	build	post-processing	scripts	in	AWS	Lambda	to	convert	project-set	
data	back	into	the	customer's	custom	format.	[Phase	2] 
Lambda	URLs	are	added	to	the	project-set	configuration	to	automatically	trigger	
these	actions	during	project	upload	and	download	steps.	[Phase	2] 
Annotators and Reviewers: 
2. Annotator Tasking: 
a. Journey: 
i. 
Annotators log into their portal to access their pre-assigned task queue 
ii. 
iii. 
They complete tasks according to provided instructions and UI capabilities. 
Tasks are submitted upon completion. 
iv. Annotators are blocked or warned if automated checks fail, or required fields 
are left blank. 
v. Once a task is submitted, the next task in the queue is served, if available. 
3. Reviewer	Tasking: 
a. Journey:	
i. 
ii. 
iii. 
Reviewers	log	into	their	task	queue	to	access	tasks	completed	by	annotators. 
They	can	update	responses	they	believe	are	incorrect	or	approve	responses	as
is. 
Reviewers	answer	any	reviewer-only	questions. 
iv. They	have	the	option	to	leave	comments	for	annotators. 
v. Reviews	are	submitted	upon	completion. 
Product Admin: 
1. Permission management: Product admin user bulk actions to manage permissions at scale 
a. Examples: 
i. 
Create customer accounts and user accounts 
ii. 
iii. 
Manage permissions (customer, annotator, reviewer, and internal)  
Provide and revoke API permissions to internal and customer user 
2. Annotator and Reviewer Impersonation:  
a. Journey: [Phase 3] 
i. 
ii. 
iii. 
Annotator reports an issue with their system.  
Product admins/support admins log into the platform and go to that rater's 
user page to impersonate the user and view the platform from their account 
[Phase 3] 
They follow the actions reported by the user to reproduce the issue [Phase 3] 
Customer or Client Admin: 
1. Customer Experience: Customer has access to a simple dashboard or account page where 
they can take a few specific actions: 
i. 
ii. 
iii. 
Manage their organization's subscription by adding or removing user seats 
[Phase 2] 
View API keys for programmatic access to submit new data and retrieve 
labeled results. [Phase 2] 
Review aggregated annotation volume consumption 
1. High-level consumption [Phase 2] 
2. Detailed analytics [Phase 3] 
iv. Import data for Ops Managers to manage for projects (see Project Set-up and 
Launch)  
1. API only 
2. Customer UI [Phase 3] 
v. Export completed datasets [Phase 3] 
4. Scope Summary 
4.1 Functional Scope 
Category 
In Scope 
Annotation 
Workflows 
Out of Scope 
Multi‑layer pipelines; configurable 
statuses; review flows; Ops controls 
Automated ML-driven pre/post
processing; advanced analytics 
Queueing & 
Assignment 
FIFO queueing; manual/automatic 
assignment; deterministic claim locking 
Random/LIFO/weighted 
assignment unless explicitly 
included 
Task UI 
Media rendering; core response 
components; level‑specific UIs 
(annotator/reviewer) 
Drafts/autosave; instructional 
pages; notifications (optional 
Phase 3) 
Ops Tooling 
Task upload; export; 
reset/archive/ignore; tagging; bulk 
assignment 
Full operational dashboards; 
advanced filtering (optional) 
Quality & 
Review 
Benchmarks; consensus workflows; 
linters; time tracking 
Deep QA analytics or ML-based 
quality scoring 
Data Model Workspace → Project → Batch → Task → 
Annotation; CRUD APIs 
External data modeling 
frameworks; cross‑system schema 
management 
Rater Portal Rater access, task view, submission WeloWorks routing unless 
explicitly selected 
Customer 
Account & Data 
Access 
Subscription & seat management; 
dataset upload and export; view their 
own API key 
Customer project creation; 
workflow configuration; task 
uploads; queue/assignment 
controls 
Project 
Configuration 
Internal setup of Workspaces, Projects, 
Batches; pipeline & UI schema 
configuration; project cloning 
Customer-facing project creation; 
unrestricted schema modification 
on in‑progress tasks 
Processing 
Hooks 
Configuration of pre/post‑processing 
triggers (e.g., external Lambda/webhook 
calls) 
Internal ML prediction pipelines or 
automated data transformation 
 
4.2 Technical Scope 
Category In Scope Out of Scope 
Architecture 
Modular service + UI component 
model; required architecture diagrams; 
clear extensibility patterns 
Integration with unrelated internal 
platforms; enterprise‑wide 
architecture rework 
Backend / 
Frontend 
Node.js/Express backend; REST APIs; 
React/TypeScript/Tailwind UI Alternate stacks/frameworks 
Storage PostgreSQL (transactional), MongoDB 
(schema‑flexible), S3 object storage 
Additional datastores or data lakes 
not listed 
Infrastructure 
& CI/CD 
Security 
AWS dev/staging/prod environments; 
GitHub Actions pipelines 
(build/test/deploy) 
Okta SSO (OAuth2); RBAC; encryption in 
transit/at rest; audit logging 
conventions 
Custom CI/CD systems; provisioning 
outside platform scope 
Pen-tests or security certifications 
not included in SOW
APIs 
REST APIs for ingest and retrieval; 
token-based auth; OpenAPI 
documentation 
GraphQL; custom integration 
frameworks 
Observability 
Performance & 
Reliability 
Datadog logs, metrics, dashboards, 
alerts; structured logging 
SIEM integrations; analytics 
infrastructure beyond Datadog 
Deterministic claim locking; p95 latency 
targets for UI/API; defined SLO/SLA 
thresholds 
Performance guarantees beyond 
SOW tiers; multi‑region DR unless 
specified