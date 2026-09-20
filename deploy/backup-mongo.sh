#!/bin/bash
# Daily MongoDB backup for the assessment platform demo. Keeps the last 7 archives.
set -e
source "$(dirname "$(readlink -f "$0")")/env.sh"
STAMP=$(date -u +%Y%m%d-%H%M)
OUT=~/backups/mongo-$STAMP.archive.gz
$C exec -T mongo mongodump --archive --gzip </dev/null > "$OUT" 2>/dev/null
# a valid dump is never tiny; drop the file if something went wrong
if [ "$(stat -c%s "$OUT")" -lt 1000 ]; then echo "$(date -u +%FT%TZ) backup FAILED (file too small)" >> ~/backups/backup.log; rm -f "$OUT"; exit 1; fi
ls -1t ~/backups/mongo-*.archive.gz | tail -n +8 | xargs -r rm -f
echo "$(date -u +%FT%TZ) backup ok $(du -h "$OUT" | cut -f1)" >> ~/backups/backup.log
