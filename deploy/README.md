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
| `reset-demo.sh` | Restores the demo databases from `~/demo-baseline` every night |
| `save-demo-baseline.sh` | Saves the current demo data as that baseline (after a size check and a trial restore) |

## First run

```bash
git clone https://github.com/ashfaque-work/nestjs-assessment-platform.git
cd nestjs-assessment-platform
# service settings: apps/<service>/.env, from the .env.example files
mkdir -p ~/backups ~/demo-baseline
deploy/build-all.sh
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
