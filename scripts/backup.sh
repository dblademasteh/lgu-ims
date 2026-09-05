#!/bin/sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
CONTAINER="${CONTAINER:-lguims-db}"
DB_USER="${DB_USER:-lguims}"
DB_NAME="${DB_NAME:-lgu_ims}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date +%F_%H%M)"
OUTPUT="$BACKUP_DIR/lgu_ims_${TIMESTAMP}.dump.gz"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "ERROR: $COMPOSE_FILE not found. Run from project root or set COMPOSE_FILE." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "Backing up $DB_NAME from container $CONTAINER..."
docker compose -f "$COMPOSE_FILE" exec -T "$CONTAINER" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc \
  | gzip > "$OUTPUT"

SIZE="$(du -h "$OUTPUT" | cut -f1)"
echo "Backup written: $OUTPUT ($SIZE)"

echo "Pruning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "lgu_ims_*.dump.gz" -mtime +"$RETENTION_DAYS" -delete -print
echo "Done."
