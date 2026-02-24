# Fix Quality Checks Table - Remove NULL check_type values
# This script fixes the database migration error

Write-Host "Fixing quality_checks table..." -ForegroundColor Yellow

# Option 1: Delete rows with NULL check_type
$query1 = "DELETE FROM quality_checks WHERE check_type IS NULL;"

# Option 2: Drop and recreate the table (if safe - no important data)
$query2 = "DROP TABLE IF EXISTS quality_checks CASCADE;"

Write-Host ""
Write-Host "Choose fix option:" -ForegroundColor Cyan
Write-Host "1. Delete rows with NULL check_type (safe if no important data)" -ForegroundColor White
Write-Host "2. Drop entire quality_checks table and let TypeORM recreate it" -ForegroundColor White
Write-Host "3. Exit without changes" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Enter choice (1, 2, or 3)"

$env:PGPASSWORD = "postgres"

switch ($choice) {
    "1" {
        Write-Host "Deleting rows with NULL check_type..." -ForegroundColor Yellow
        docker exec -it welo-postgres psql -U postgres -d welo_platform -c "DELETE FROM quality_checks WHERE check_type IS NULL;"
        docker exec -it welo-postgres psql -U postgres -d welo_platform -c "SELECT COUNT(*) as remaining_rows FROM quality_checks;"
        Write-Host "Done! Restart the services." -ForegroundColor Green
    }
    "2" {
        Write-Host "Dropping quality_checks table..." -ForegroundColor Yellow
        docker exec -it welo-postgres psql -U postgres -d welo_platform -c "DROP TABLE IF EXISTS quality_checks CASCADE;"
        Write-Host "Done! TypeORM will recreate it on service start." -ForegroundColor Green
    }
    "3" {
        Write-Host "No changes made. Exiting..." -ForegroundColor Gray
    }
    default {
        Write-Host "Invalid choice. Exiting..." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "If you still see errors, you may need to drop all tables and resync:" -ForegroundColor Cyan
Write-Host "  docker exec -it welo-postgres psql -U postgres -d welo_platform -c '\dt'" -ForegroundColor White
Write-Host "  docker exec -it welo-postgres psql -U postgres -d welo_platform -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'" -ForegroundColor White
