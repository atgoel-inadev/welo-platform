# Reset Database Schema
# WARNING: This will DELETE ALL DATA in the database!
# Only use in development environment

Write-Host "=== DATABASE RESET WARNING ===" -ForegroundColor Red
Write-Host "This will DROP ALL TABLES and DELETE ALL DATA!" -ForegroundColor Red
Write-Host ""
$confirmation = Read-Host "Type 'YES' to confirm you want to reset the database"

if ($confirmation -ne "YES") {
    Write-Host "Database reset cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Dropping all tables..." -ForegroundColor Yellow

# Drop all tables with CASCADE to handle foreign key constraints
$tables = @(
    'annotation_responses',
    'annotation_versions',
    'annotations',
    'assignments',
    'audit_logs',
    'batches',
    'comments',
    'customers',
    'exports',
    'gold_tasks',
    'notifications',
    'plugin_execution_logs',
    'plugin_secrets',
    'project_team_members',
    'projects',
    'queues',
    'quality_checks',
    'quality_rules',
    'review_approvals',
    'state_transitions',
    'tasks',
    'templates',
    'users'
)

foreach ($table in $tables) {
    Write-Host "Dropping table: $table" -ForegroundColor Gray
    docker exec -it welo-postgres psql -U postgres -d welo_platform -c "DROP TABLE IF EXISTS $table CASCADE;" | Out-Null
}

Write-Host ""
Write-Host "=== All tables dropped ===" -ForegroundColor Green
Write-Host "Run .\scripts\setup-database-schema.ps1 to recreate the schema" -ForegroundColor Cyan
