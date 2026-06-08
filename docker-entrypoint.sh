#!/bin/sh
set -e

echo "▶ Running database migrations..."
node scripts/run-migrations.js

echo "▶ Starting Next.js server..."
exec node server.js
