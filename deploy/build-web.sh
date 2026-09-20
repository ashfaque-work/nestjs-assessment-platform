#!/bin/bash
# Builds the web app into apps/web/dist, which Caddy serves. Node runs in a container, so the
# server needs nothing but Docker.
set -e
source "$(dirname "$(readlink -f "$0")")/env.sh"
cd apps/web
docker run --rm -v "$PWD":/app -w /app -e HOME=/tmp -u "$(id -u):$(id -g)" node:22-alpine \
  sh -c "npm ci --no-audit --no-fund --loglevel=error && npm run build"
ls -la dist | head
