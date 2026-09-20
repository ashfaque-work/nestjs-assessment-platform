# Shared by the deploy scripts: the repository root and the compose command for the server.
ROOT="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/.." && pwd)"
cd "$ROOT" || exit 1
C="docker compose -f docker-compose.local.yml -f deploy/docker-compose.server.yml"
