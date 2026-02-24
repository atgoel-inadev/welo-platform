# Database Schema Management

## Current Setup

**Schema synchronization is DISABLED** for local development to prevent conflicts when multiple services start simultaneously.

### Why Synchronize is Off

TypeORM's `synchronize: true` automatically creates/updates database schema on startup. This causes issues when:
- Multiple services try to sync the same tables simultaneously
- Existing data has constraints that conflict with schema changes
- You want explicit control over schema migrations

### Environment Configuration

All startup scripts now use `NODE_ENV=production` which **disables automatic schema synchronization**.

```powershell
$env:NODE_ENV = "production"  # Disables TypeORM synchronize
```

### When Schema IS Already Created

✅ **Current state:** Schema exists in database  
✅ **Services will start** without trying to modify tables  
✅ **Faster startup** (no sync overhead)  

---

## If You Need to Update Schema

### Option 1: Manual SQL (Recommended)

Connect to database and run SQL directly:

```powershell
docker exec -it welo-postgres psql -U postgres -d welo_platform
```

Then run your schema changes:
```sql
ALTER TABLE tasks ADD COLUMN new_field VARCHAR(255);
CREATE INDEX idx_tasks_new_field ON tasks(new_field);
```

### Option 2: Drop and Recreate Tables

**⚠️ WARNING: This deletes all data in the table!**

```powershell
docker exec -it welo-postgres psql -U postgres -d welo_platform -c "DROP TABLE quality_checks CASCADE;"
```

Then restart the service - TypeORM will recreate the table.

### Option 3: Full Database Reset

**⚠️ WARNING: This deletes ALL data!**

```powershell
docker exec -it welo-postgres psql -U postgres -d welo_platform -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

Then change ONE startup script to use `NODE_ENV=development` and start that service first. It will create all tables. Then switch back to `production` for other services.

---

## Troubleshooting

### Error: "column X does not exist"

Your entity code expects a column that doesn't exist in the database.

**Fix:**
```powershell
# Add the column manually
docker exec -it welo-postgres psql -U postgres -d welo_platform -c "ALTER TABLE table_name ADD COLUMN column_name TYPE;"
```

### Error: "relation X does not exist"

The table doesn't exist.

**Fix:**
```powershell
# Let TypeORM create it (temporarily enable sync for one service)
# Edit start-project-management.ps1 → set NODE_ENV="development"
# Start the service → it creates tables
# Stop service → revert to NODE_ENV="production"
```

### Error: "column X of relation Y contains null values"

Existing data has NULLs but entity requires NOT NULL.

**Fix:**
```powershell
# Option A: Update existing data
docker exec -it welo-postgres psql -U postgres -d welo_platform -c "UPDATE table SET column = 'default_value' WHERE column IS NULL;"

# Option B: Drop the table and recreate
docker exec -it welo-postgres psql -U postgres -d welo_platform -c "DROP TABLE table_name CASCADE;"
# Then restart service
```

---

## Production Migrations (Future)

For production deployments, use TypeORM migrations:

```bash
# Generate migration
npm run typeorm migration:generate -- -n MigrationName

# Run migrations
npm run typeorm migration:run

# Revert migration
npm run typeorm migration:revert
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `\dt` | List all tables |
| `\d table_name` | Describe table schema |
| `SELECT * FROM table_name LIMIT 10;` | View data |
| `DROP TABLE table_name CASCADE;` | Delete table and dependencies |
| `TRUNCATE TABLE table_name;` | Delete all rows but keep schema |

Connect to database:
```powershell
docker exec -it welo-postgres psql -U postgres -d welo_platform
```

---

## Current Status

✅ Schema exists with 23 tables  
✅ All services configured with `synchronize: false` (via NODE_ENV=production)  
✅ Services will NOT modify database schema on startup  
✅ Manual schema changes required  
