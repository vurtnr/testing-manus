#!/bin/sh
set -e

for migration in /docker-entrypoint-initdb.d/migrations/*.sql; do
  [ -e "$migration" ] || continue
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$migration"
done
