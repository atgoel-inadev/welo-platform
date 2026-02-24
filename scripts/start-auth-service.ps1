# Start Auth Service (Port 3002)
# Run from: welo-platform/

Write-Host "Starting Auth Service..." -ForegroundColor Green

$env:NODE_ENV = "production"
$env:PORT = "3002"
$env:DATABASE_HOST = "localhost"
$env:DATABASE_PORT = "5432"
$env:DATABASE_USERNAME = "postgres"
$env:DATABASE_PASSWORD = "postgres"
$env:DATABASE_NAME = "welo_platform"
$env:REDIS_HOST = "localhost"
$env:REDIS_PORT = "6379"
$env:JWT_SECRET = "your-secret-key-change-in-production"
$env:JWT_EXPIRES_IN = "1h"
$env:REFRESH_TOKEN_EXPIRES_IN = "7d"
$env:KAFKA_BROKERS = "localhost:9092"
$env:KAFKA_CLIENT_ID = "auth-service"
$env:KAFKA_GROUP_ID = "auth-service-group"

Write-Host "Environment configured for Auth Service" -ForegroundColor Cyan
Write-Host "Port: 3002" -ForegroundColor Yellow
Write-Host "Running: npm run start:auth-service" -ForegroundColor Yellow
Write-Host ""

npm run start:auth-service
