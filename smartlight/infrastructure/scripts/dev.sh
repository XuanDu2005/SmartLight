# ============================================================================
# SmartLight local dev shortcut \u2014 docker-compose up with logs.
# ============================================================================
set -euo pipefail
docker compose up -d --build
echo
echo "SmartLight stack is starting up. Tailing logs (Ctrl+C to stop)..."
docker compose logs -f
