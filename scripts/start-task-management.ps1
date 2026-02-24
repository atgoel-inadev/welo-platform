# Start Task Management Service (Port 3003)
# Run from: welo-platform/

Write-Host "Starting Task Management Service..." -ForegroundColor Green

$env:NODE_ENV = "production"
$env:PORT = "3003"
$env:DATABASE_HOST = "localhost"
$env:DATABASE_PORT = "5432"
$env:DATABASE_USERNAME = "postgres"
$env:DATABASE_PASSWORD = "postgres"
$env:DATABASE_NAME = "welo_platform"
$env:REDIS_HOST = "localhost"
$env:REDIS_PORT = "6379"
$env:KAFKA_BROKERS = "localhost:9092"
$env:KAFKA_CLIENT_ID = "task-management-service"
$env:KAFKA_GROUP_ID = "task-management-service-group"
$env:PLUGIN_SECRETS_KEY = "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"

Write-Host "Environment configured for Task Management" -ForegroundColor Cyan
Write-Host "Port: 3003" -ForegroundColor Yellow
Write-Host "Running: npm run start:task-management" -ForegroundColor Yellow
Write-Host ""

npm run start:task-management
