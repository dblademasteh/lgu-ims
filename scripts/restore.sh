#!/bin/sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
CONTAINER="${CONTAINER:-lguims-db}"
DB_USER="${DB_USER:-lguims}"
DB_NAME="${DB_NAME:-lgu_ims}"
INPUT="${1:-}"

if [ -z "$INPUT" ]; then
  echo "Usage: $0 <backup-file.dump.gz>" >&2
  exit 1
fi
if [ ! -f "$INPUT" ]; then
  echo "ERROR: file not found: $INPUT" >&2
  exit 1
fi

echo "Restoring $INPUT into $DB_NAME on $CONTAINER..."
gunzip -c "$INPUT" \
  | docker compose -f "$COMPOSE_FILE" exec -T "$CONTAINER" \
      pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists

echo "Restore complete."
