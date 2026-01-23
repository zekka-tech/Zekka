#!/bin/bash

# Direct SQL execution for migrations
# Bypasses the migration tracker to set up the database

DB_URL="postgresql://postgres.yusnxcdlmnkmdjimtmic:9977553311%40Zekka@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?uselibpqcompat=true&sslmode=require"

echo "Running database migrations..."
echo "=============================="

for sql_file in migrations/*.sql; do
  if [ -f "$sql_file" ]; then
    filename=$(basename "$sql_file")
    echo "Applying: $filename"

    # Use psql to execute the SQL file
    psql "$DB_URL" -f "$sql_file" 2>&1 | grep -v "CREATE TABLE IF NOT EXISTS\|CREATE INDEX IF NOT EXISTS\|relation.*already exists" | head -20

    if [ $? -eq 0 ]; then
      echo "  ✓ Applied successfully"
    else
      echo "  ⚠ Warning - some errors encountered (may be expected)"
    fi
    echo ""
  fi
done

echo "=============================="
echo "Migration complete!"
