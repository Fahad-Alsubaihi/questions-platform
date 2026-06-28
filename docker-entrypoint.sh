#!/bin/sh
set -e

echo "▶ Running database migrations..."
node scripts/run-migrations.js

echo "▶ Creating admin user..."
node scripts/create-admin.js

echo "▶ Seeding default config..."
node scripts/seed.js

echo "▶ Importing base questions..."
node scripts/import-questions.js

echo "▶ Starting Next.js server..."
exec node server.js
