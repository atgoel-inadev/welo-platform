# Welo Platform Development Documentation

This directory contains planning templates and completed feature documentation.

---

## Quick Links

### 📋 Templates

- **[Feature Plan Template](./FEATURE_PLAN_TEMPLATE.md)** - Use this for every new feature
- Copy to `docs/features/your-feature-name.md` before starting work

### 📚 Workflow Guides

Located in project root:
- **[Development Workflow Guide](../DEVELOPMENT_WORKFLOW.md)** - Comprehensive guide with examples
- **[Workflow Cheat Sheet](../WORKFLOW_CHEAT_SHEET.md)** - Quick reference
- **[Docker Build Guide](../DOCKER_BUILD_GUIDE.md)** - Docker-specific best practices

---

## How to Use This System

### Starting a New Feature

1. **Copy the template:**
   ```bash
   cp docs/FEATURE_PLAN_TEMPLATE.md docs/features/my-feature.md
   ```

2. **Fill out the plan (15-20 min):**
   - Define API contracts
   - List database changes
   - Write testing commands
   - Break into phases

3. **Follow the workflow:**
   - Backend → Test → Frontend → Integration
   - See [WORKFLOW_CHEAT_SHEET.md](../WORKFLOW_CHEAT_SHEET.md)

4. **Mark as complete:**
   - Update success criteria
   - Update timeline with actual times
   - Note lessons learned

---

## Feature Documentation Directory

```
docs/
├── FEATURE_PLAN_TEMPLATE.md    # Template for new features
├── README.md                    # This file
└── features/
    ├── batch-assignment.md      # Example: Completed feature
    ├── task-auto-assign.md      # Example: In progress
    └── ...                      # Your features here
```

---

## Expected Time Savings

### Before (Reactive Approach)
- Implementation: 3+ hours
- Rebuild cycles: 6+
- Frustration: High

### After (Contract-First Approach)
- Planning: 15-20 min
- Implementation: 90-120 min
- Rebuild cycles: 1-2
- Confidence: High

**Time Saved: 33-50% per feature**

---

## Templates by Domain

### Creating API Testing Scripts

**Location:** `scripts/test-{domain}-apis.ps1`

**Template:**
```powershell
$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:PORT/api/v1"

Write-Host "=== Testing {Domain} APIs ===" -ForegroundColor Green

# Test 1: List
Write-Host "`nTesting GET /resources" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$baseUrl/resources"

# Test 2: Create
Write-Host "`nTesting POST /resource" -ForegroundColor Yellow
$body = @{ field = "value" } | ConvertTo-Json
Invoke-RestMethod -Uri "$baseUrl/resource" -Method Post -Body $body -ContentType "application/json"

Write-Host "`n=== Tests Complete ===" -ForegroundColor Green
```

---

## Best Practices Reminder

✅ **DO:**
- Define API contracts first
- Test backend with curl before frontend work
- Use shared types (`libs/common/src/dto/`)
- Build only the service you changed
- Document as you go

❌ **DON'T:**
- Start coding without a plan
- Integrate untested backend with frontend
- Save TypeORM entities with loaded relations
- Run `docker compose down` unnecessarily
- Skip error case testing

---

## Common Commands Reference

### Feature Planning
```bash
# Copy template
cp docs/FEATURE_PLAN_TEMPLATE.md docs/features/my-feature.md

# Edit plan
code docs/features/my-feature.md
```

### Development
```bash
# Build service
docker compose build service-name

# Restart service
docker compose up -d service-name

# View logs
docker compose logs -f service-name
```

### Testing
```powershell
# Run API test script
.\scripts\test-domain-apis.ps1

# Quick API test
Invoke-RestMethod -Uri "http://localhost:3003/api/v1/endpoint"
```

---

## Need Help?

1. **Check the guides first:**
   - [WORKFLOW_CHEAT_SHEET.md](../WORKFLOW_CHEAT_SHEET.md) for quick answers
   - [DEVELOPMENT_WORKFLOW.md](../DEVELOPMENT_WORKFLOW.md) for detailed explanations

2. **Review completed features:**
   - Look in `docs/features/` for similar examples
   - See how others structured their plans

3. **Common issues:**
   - TypeORM problems? See Section "Common Pitfalls" in workflow guide
   - Docker build issues? See [DOCKER_BUILD_GUIDE.md](../DOCKER_BUILD_GUIDE.md)
   - API contract mismatches? Use shared types from `libs/common/`

---

**Last Updated:** February 23, 2026
