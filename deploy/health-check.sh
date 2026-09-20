#!/bin/bash
# Checks the API through the public entry point and restarts a wedged container.
# Runs from cron every 5 minutes; keeps its own log trimmed.
source "$(dirname "$(readlink -f "$0")")/env.sh"
LOG=~/health.log
STATE=~/.health-fail-count
HOST=assess.ashfaqueahmad.com
# a deploy in progress (deploy/build-all.sh) restarts containers itself
if [ -n "$(find ~/.deploying -mmin -30 2>/dev/null)" ]; then exit 0; fi

now() { date -u +%FT%TZ; }
probe() { curl -sk -m 20 -o /dev/null -w "%{http_code}" --resolve "$HOST:443:127.0.0.1" "$@"; }

code=$(probe "https://$HOST/api-json")
login=$(probe -X POST -H 'content-type: application/json' -H 'instancekey: staging' \
  -d '{"userId":"probe@example.com","password":"probe"}' "https://$HOST/auth/login")

# healthy when Swagger answers and auth rejects the probe login (401), or rate-limits it (429)
if [ "$code" = "200" ] && { [ "$login" = "401" ] || [ "$login" = "429" ]; }; then
  echo 0 > "$STATE"
  exit 0
fi

fails=$(( $(cat "$STATE" 2>/dev/null || echo 0) + 1 ))
echo "$fails" > "$STATE"
echo "$(now) unhealthy (api=$code login=$login) consecutive=$fails" >> "$LOG"

# one bad check can be a blip; act on the second in a row
if [ "$fails" -ge 2 ]; then
  down=$($C ps --status exited --status dead --format '{{.Service}}' </dev/null | tr '\n' ' ')
  if [ -n "$down" ]; then
    echo "$(now) restarting stopped: $down" >> "$LOG"
    $C up -d </dev/null >/dev/null 2>&1
  else
    echo "$(now) restarting gateway and auth" >> "$LOG"
    $C restart gateway auth </dev/null >/dev/null 2>&1
  fi
  echo 0 > "$STATE"
fi

tail -n 500 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
