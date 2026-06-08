#!/bin/sh
set -e

echo "▶ Running database migrations..."
node scripts/run-migrations.js

echo "▶ Importing base questions..."
node scripts/import-questions.js

echo "▶ Starting Next.js server..."
exec node server.js
