param()
Write-Host "Building and starting containers..."
docker compose up --build -d
Write-Host "Services started. Backend: http://localhost:8000 (docs at /docs), Frontend: http://localhost:3000"
docker compose ps
