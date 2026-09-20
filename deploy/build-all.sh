#!/bin/bash
# Rebuilds every service image and the web app, then starts whatever changed.
# Build logs go to ~/build-<service>.log.
source "$(dirname "$(readlink -f "$0")")/env.sh"
# health-check.sh leaves the stack alone while this runs
touch ~/.deploying
trap "rm -f ~/.deploying" EXIT
failed=0
for svc in auth gateway notify administration assessment classroom course ecommerce question-bank attempt; do
  t=$(date +%s)
  if $C build $svc > ~/build-$svc.log 2>&1; then echo "$svc OK ($(( $(date +%s)-t ))s)"; else echo "$svc FAILED"; tail -20 ~/build-$svc.log; failed=1; fi
done
if "$ROOT/deploy/build-web.sh" > ~/build-web.log 2>&1; then echo "web OK"; else echo "web FAILED"; tail -20 ~/build-web.log; failed=1; fi
$C up -d </dev/null 2>&1 | grep -cE "Recreated|Started" | sed "s/^/recreated: /"
echo BUILD-DONE
exit $failed
