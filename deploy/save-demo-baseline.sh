#!/bin/bash
# Saves the current demo databases as the baseline that reset-demo.sh restores every night.
# Run it after changing the demo content on purpose. A new dump replaces the old baseline only
# after it passes a size check and a trial restore, so a failed dump cannot wipe the demo.
set -e
source "$(dirname "$(readlink -f "$0")")/env.sh"
MIN_BYTES=5000

for db in stagingdb newstagingdb; do
  tmp=$(mktemp ~/demo-baseline/.$db.XXXXXX)
  $C exec -T mongo mongodump --archive --gzip --db "$db" </dev/null > "$tmp" 2>/dev/null
  size=$(stat -c%s "$tmp")
  if [ "$size" -lt "$MIN_BYTES" ]; then
    rm -f "$tmp"; echo "$db: dump too small ($size bytes), baseline kept"; exit 1
  fi
  if ! $C exec -T mongo mongorestore --archive --gzip --dryRun --nsInclude "$db.*" < "$tmp" >/dev/null 2>&1; then
    rm -f "$tmp"; echo "$db: dump does not restore, baseline kept"; exit 1
  fi
  mv "$tmp" ~/demo-baseline/$db.archive.gz
  echo "$db: baseline saved ($size bytes)"
done
