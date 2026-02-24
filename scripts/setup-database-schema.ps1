# Setup Database Schema
# This script runs annotation-qa-service with synchronize enabled to create all tables
# Run this ONCE after dropping tables, then use regular startup scripts

Write-Host "=== Database Schema Setup ===" -ForegroundColor Green
Write-Host "This will create all database tables using TypeORM synchronize" -ForegroundColor Yellow
Write-Host ""

$env:NODE_ENV = "development"  # Enable TypeORM synchronize
$env:PORT = "3005"
$env:DATABASE_HOST = "localhost"
$env:DATABASE_PORT = "5432"
$env:DATABASE_USERNAME = "postgres"
$env:DATABASE_PASSWORD = "postgres"
$env:DATABASE_NAME = "welo_platform"
$env:REDIS_HOST = "localhost"
$env:REDIS_PORT = "6379"
$env:KAFKA_BROKERS = "localhost:9092"
$env:KAFKA_CLIENT_ID = "annotation-qa-service-setup"
$env:KAFKA_GROUP_ID = "annotation-qa-service-setup-group"
$env:WORKFLOW_ENGINE_URL = "http://localhost:3001/api/v1"

Write-Host "Starting annotation-qa-service with synchronize enabled..." -ForegroundColor Cyan
Write-Host "Wait for 'Nest application successfully started' message, then press Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Start the service - it will create all tables
npm run start:annotation-qa-service

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host "Database schema has been created." -ForegroundColor Green
Write-Host "You can now start services with production mode (synchronize disabled)." -ForegroundColor Green
