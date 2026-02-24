# Start Project Management Service (Port 3004) - Test Version
# This version logs environment variables for debugging

Write-Host "Starting Project Management Service (Test Mode)..." -ForegroundColor Green
Write-Host ""

# Set environment variables
$env:NODE_ENV = "production"
$env:PORT = "3004"
$env:POSTGRES_HOST = "localhost"
$env:POSTGRES_PORT = "5432"
$env:POSTGRES_USER = "postgres"
$env:POSTGRES_PASSWORD = "postgres"
$env:POSTGRES_DB = "welo_platform"
$env:REDIS_HOST = "localhost"
$env:REDIS_PORT = "6379"
$env:KAFKA_BROKERS = "localhost:9092"
$env:KAFKA_CLIENT_ID = "project-management-service"
$env:KAFKA_GROUP_ID = "project-management-service-group"
$env:PLUGIN_SECRETS_KEY = "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"
$env:ENABLE_DIRECTORY_SCAN = "true"
$env:MEDIA_FILES_PATH = "$PSScriptRoot\..\..\welo-platform-ui\public\uploads"

Write-Host "=== Environment Variables ===" -ForegroundColor Cyan
Write-Host "NODE_ENV: $env:NODE_ENV" -ForegroundColor White
Write-Host "PORT: $env:PORT" -ForegroundColor White
Write-Host "POSTGRES_HOST: $env:POSTGRES_HOST" -ForegroundColor White
Write-Host "KAFKA_BROKERS: $env:KAFKA_BROKERS" -ForegroundColor Yellow
Write-Host "KAFKA_CLIENT_ID: $env:KAFKA_CLIENT_ID" -ForegroundColor Yellow
Write-Host "KAFKA_GROUP_ID: $env:KAFKA_GROUP_ID" -ForegroundColor Yellow
Write-Host "MEDIA_FILES_PATH: $env:MEDIA_FILES_PATH" -ForegroundColor White
Write-Host ""

Write-Host "Starting service..." -ForegroundColor Green
npm run start:project-management
