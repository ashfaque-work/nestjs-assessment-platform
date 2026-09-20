#!/bin/bash
# Puts the demo data back to its baseline (taken 2026-09-19): every visitor shares the demo
# accounts, so attempts, profile edits or a changed password would otherwise pile up for all.
# Runs nightly from cron; the baseline archives are in ~/demo-baseline.
set -e
source "$(dirname "$(readlink -f "$0")")/env.sh"
LOG=~/demo-baseline/reset.log

for db in stagingdb newstagingdb; do
  archive=~/demo-baseline/$db.archive.gz
  # never restore (with --drop) from a missing or broken baseline
  if [ "$(stat -c%s "$archive" 2>/dev/null || echo 0)" -lt 5000 ]; then echo "$(date -u +%FT%TZ) reset SKIPPED: baseline for $db missing or too small" >> "$LOG"; exit 1; fi
  $C exec -T mongo mongorestore --archive --gzip --drop --nsInclude "$db.*" < "$archive" 2>/dev/null
done

# Cached copies of settings and tests are keyed by instance; the Bull queues (bull:*) are kept
$C exec -T redis sh -c 'for p in "staging*" "proctoring*"; do redis-cli --scan --pattern "$p" | xargs -r redis-cli del > /dev/null; done' </dev/null

echo "$(date -u +%FT%TZ) reset ok" >> "$LOG"
