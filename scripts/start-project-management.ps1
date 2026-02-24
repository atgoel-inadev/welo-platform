# Start Project Management Service (Port 3004)
# Run from: welo-platform/

Write-Host "Starting Project Management Service..." -ForegroundColor Green

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
# Media path points to UI public directory (absolute path)
$env:MEDIA_FILES_PATH = "$PSScriptRoot\..\..\welo-platform-ui\public\uploads"

Write-Host "Environment configured for Project Management" -ForegroundColor Cyan
Write-Host "Port: 3004" -ForegroundColor Yellow
Write-Host "Media Path: $env:MEDIA_FILES_PATH" -ForegroundColor Yellow
Write-Host "Running: npm run start:project-management" -ForegroundColor Yellow
Write-Host ""

npm run start:project-management
