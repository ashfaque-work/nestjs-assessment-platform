# Server setup

How the live demo at https://assess.ashfaqueahmad.com runs: one 2-core ARM VM with 12 GB RAM, Docker,
and everything else in this folder.

| File | What it does |
| --- | --- |
| `docker-compose.server.yml` | Overrides for the server on top of `docker-compose.local.yml`: Caddy in front, gateway not exposed, MongoDB cache capped |
| `Caddyfile` | HTTPS (Let's Encrypt), serves the web app, proxies everything else to the gateway |
| `build-all.sh` | Rebuilds every service image and the web app, then restarts what changed |
| `build-web.sh` | Builds `apps/web` into `apps/web/dist` (Node runs in a container) |
| `health-check.sh` | Probes the API through Caddy; restarts containers after two failed checks in a row |
| `backup-mongo.sh` | Daily `mongodump`, keeps the last 7 in `~/backups` |
| `reset-demo.sh` | Restores the demo databases from `~/demo-baseline` every night, then repairs the shared demo student |
| `repair-demo-student.mongosh.js` | Activates the shared sample student and fills missing initial subject levels after a restore; preserves existing higher levels | 
| `save-demo-baseline.sh` | Saves the current demo data as that baseline (after a size check and a trial restore) |

## First run

```bash
git clone https://github.com/ashfaque-work/nestjs-assessment-platform.git
cd nestjs-assessment-platform
# service settings: apps/<service>/.env, from the .env.example files
mkdir -p ~/backups ~/demo-baseline
deploy/build-all.sh
# create the query indexes on each instance database (autoIndex is off, so this is explicit)
for db in stagingdb newstagingdb; do
  docker compose -f docker-compose.local.yml -f deploy/docker-compose.server.yml \
    exec -T mongo mongosh "$db" --quiet < scripts/create-indexes.mongosh.js
done
# once the demo data is in place
deploy/save-demo-baseline.sh
```

Point the domain's DNS A record at the VM and open ports 80 and 443; Caddy gets the
certificate on its own.

## Cron

```cron
30 2 * * *   ~/nestjs-assessment-platform/deploy/backup-mongo.sh
*/5 * * * *  ~/nestjs-assessment-platform/deploy/health-check.sh
30 21 * * *  ~/nestjs-assessment-platform/deploy/reset-demo.sh
```

## Everyday commands

```bash
docker compose -f docker-compose.local.yml -f deploy/docker-compose.server.yml ps
docker compose -f docker-compose.local.yml -f deploy/docker-compose.server.yml logs -f gateway
```

## Demo account repair

The shared sample student must be active and have level 1 in each enrolled subject. Older baseline archives can restore an inactive account with no levels, causing test pages to reject the student even though sign-in works. `reset-demo.sh` now repairs that sample account immediately after each database restore. Other accounts are not changed; existing higher levels are preserved, and the repair refuses databases other than `stagingdb` and `newstagingdb`.

Validate the repair without a database:

```bash
node deploy/repair-demo-student.test.cjs
```

To install this protection, deploy the updated checkout and both scripts to the VM that runs the nightly cron. Merging the pull request alone does not update that server. The live account was separately restored through the API on 2026-10-18, and the live demo workflow passed afterward.
