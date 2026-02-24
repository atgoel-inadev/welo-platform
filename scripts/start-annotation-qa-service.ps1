# Start Annotation QA Service (Port 3005)
# Run from: welo-platform/

Write-Host "Starting Annotation QA Service..." -ForegroundColor Green

$env:NODE_ENV = "production"
$env:PORT = "3005"
$env:DATABASE_HOST = "localhost"
$env:DATABASE_PORT = "5432"
$env:DATABASE_USERNAME = "postgres"
$env:DATABASE_PASSWORD = "postgres"
$env:DATABASE_NAME = "welo_platform"
$env:REDIS_HOST = "localhost"
$env:REDIS_PORT = "6379"
$env:KAFKA_BROKERS = "localhost:9092"
$env:KAFKA_CLIENT_ID = "annotation-qa-service"
$env:KAFKA_GROUP_ID = "annotation-qa-service-group"
$env:WORKFLOW_ENGINE_URL = "http://localhost:3001/api/v1"

Write-Host "Environment configured for Annotation QA Service" -ForegroundColor Cyan
Write-Host "Port: 3005" -ForegroundColor Yellow
Write-Host "Running: npm run start:annotation-qa-service" -ForegroundColor Yellow
Write-Host ""

npm run start:annotation-qa-service
