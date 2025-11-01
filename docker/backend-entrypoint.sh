#!/bin/sh
set -eu

# BusyBox / dash do not support pipefail. Only enable when available.
if [ -n "${BASH:-}" ]; then
  set -o pipefail
fi

cd /app/apps/backend

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running database migrations..."
  npx prisma migrate deploy
fi

echo "Starting backend..."
exec node dist/main.js
