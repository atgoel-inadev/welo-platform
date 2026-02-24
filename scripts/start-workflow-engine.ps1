# Start Workflow Engine (Port 3001)
# Run from: welo-platform/

Write-Host "Starting Workflow Engine..." -ForegroundColor Green

$env:NODE_ENV = "production"
$env:PORT = "3001"
$env:DATABASE_HOST = "localhost"
$env:DATABASE_PORT = "5432"
$env:DATABASE_USERNAME = "postgres"
$env:DATABASE_PASSWORD = "postgres"
$env:DATABASE_NAME = "welo_platform"
$env:REDIS_HOST = "localhost"
$env:REDIS_PORT = "6379"
$env:KAFKA_BROKERS = "localhost:9092"
$env:KAFKA_CLIENT_ID = "workflow-engine-service"
$env:KAFKA_GROUP_ID = "workflow-engine-service-group"

Write-Host "Environment configured for Workflow Engine" -ForegroundColor Cyan
Write-Host "Port: 3001" -ForegroundColor Yellow
Write-Host "Running: npm run start:workflow-engine" -ForegroundColor Yellow
Write-Host ""

npm run start:workflow-engine
