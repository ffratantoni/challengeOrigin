#!/usr/bin/env bash
set -euo pipefail

# Build and run all services (backend, frontend, db)
docker compose up --build -d

echo "Services started. Backend: http://localhost:8000 docs at /docs, Frontend: http://localhost:3000"
docker compose ps
