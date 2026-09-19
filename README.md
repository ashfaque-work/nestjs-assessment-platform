# NestJS Assessment Platform

[![CI](https://github.com/ashfaque-work/nestjs-assessment-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/ashfaque-work/nestjs-assessment-platform/actions/workflows/ci.yml)

An online assessment and learning platform (tests, question bank, classrooms, courses, proctoring, e-commerce): a **NestJS microservices** backend and a **React** student app, in one monorepo.

## Live demo

- **[assess.ashfaqueahmad.com](https://assess.ashfaqueahmad.com)**: the web app. The sign-in page fills in either demo
  account: as the **student**, take a timed test and review every answer; as the **teacher**, write and publish a
  test and see a sample class's results.
- **[assess.ashfaqueahmad.com/api](https://assess.ashfaqueahmad.com/api)**: Swagger UI for the API.

All 10 services, MongoDB, Redis and the web app run in Docker on a single 2-core ARM VM.

To call a protected endpoint from Swagger or curl:

1. `POST /auth/login` with the header `instancekey: staging` and body
   `{ "userId": "demo-student@example.com", "password": "DmnTAiBaXDSPM4#7a" }`
2. Send the returned token as the `authtoken` header, together with `instancekey: staging`.

The demo holds sample data only. Everyone shares the demo accounts, so the data is put back to its starting state every night (21:30 UTC).

## Architecture

One public HTTP service in front of nine gRPC services. Only the gateway is reachable from
the internet; the services talk to each other over gRPC on a private Docker network.

```mermaid
flowchart LR
    client["Browser"]
    caddy["Caddy<br/>TLS termination"]
    web["apps/web<br/>React student app<br/>(static files)"]
    gw["gateway<br/>REST + Swagger<br/>JWT, roles, rate limit"]

    subgraph services["gRPC services (apps/)"]
        direction TB
        auth["auth<br/>users, login, institutes"]
        admin["administration<br/>settings, platform, reports"]
        assessment["assessment<br/>tests, sections"]
        attempt["attempt<br/>attempts, analysis, proctoring"]
        classroom["classroom"]
        course["course"]
        qbank["question-bank<br/>questions, feedback"]
        ecommerce["ecommerce<br/>payments, coupons"]
        notify["notify<br/>email"]
    end

    mongo[("MongoDB<br/>one database per instance")]
    redis[("Redis<br/>cache + Bull queues")]
    s3["AWS S3<br/>media, recordings"]

    client -->|HTTPS| caddy
    caddy -->|app pages| web
    caddy -->|API| gw
    gw -->|gRPC| services
    services --> mongo
    gw --> redis
    attempt --> redis
    attempt --> s3
```

Every RPC carries the caller's `instancekey`, which decides the database the repositories read:

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant G as gateway
    participant S as assessment
    participant M as MongoDB

    C->>G: GET /test/list<br/>authtoken + instancekey: staging
    G->>G: verify the JWT, load roles
    G->>S: gRPC ListTests (instancekey travels with the call)
    Note over S: TenantAwareServerGrpc opens an<br/>AsyncLocalStorage scope for this call
    S->>M: read from stagingdb
    M-->>S: documents
    S-->>G: tests
    G-->>C: 200 JSON
```

A second concurrent request for another instance runs in its own scope, so the two never
share the key.

| Path | What it is |
|---|---|
| `apps/web` | Web app for students and teachers: React, TypeScript, Vite, TanStack Query, Tailwind |
| `apps/gateway` | Public HTTP API. Validates the JWT, checks roles, forwards calls to services over gRPC |
| `apps/<service>` | gRPC microservices, one per domain |
| `apps/video-streaming` | Experimental mediasoup WebRTC server |
| `libs/common` | Shared code: Mongoose schemas and repositories, DTOs, gRPC clients, auth guards, config |
| `proto/` | gRPC contracts (about 950 RPCs) |

### Multi-instance (multi-tenant) databases
Every request carries an `instancekey` header that selects the MongoDB database for that instance (see `libs/common/src/config`).
Repositories read the key from a per-request `AsyncLocalStorage` context (`libs/common/src/database/tenant-context.ts`), so concurrent requests for different instances stay isolated.

## Requirements
- Node.js 22+
- MongoDB 6+
- Redis 6+

## Setup

```bash
npm install
cp .env.example .env   # then edit values
```

All configuration (database URIs, Redis, JWT secret, AWS, email) comes from environment variables. No credentials are stored in the repository.
Set `APP_ENV=dev` for development.

## Running

Each service is started separately (one terminal per service), for example:

```bash
npx nest start auth --watch
npx nest start gateway --watch
```

Start `auth` plus the services you need, then `gateway`. Swagger UI is available at `http://localhost:8000/api`.

Production build of one service:

```bash
npx nest build gateway
node dist/apps/gateway/main.js
```

## Docker

Every service has a multi-stage `Dockerfile` in `apps/<service>/`. To run the whole stack (all services, Redis and MongoDB):

```bash
cp .env.example .env
docker compose -f docker-compose.local.yml up --build
```

Configuration is passed as environment variables; no `.env` file is copied into the images.

## Authentication
- `POST /auth/login` returns a JWT. Send it as the `authtoken` header together with `instancekey`.
- `AuthenticationGuard` verifies the token and loads the user; `RolesGuard` checks the user's roles from the database.
- `GET /auth/refreshToken` issues a new token only for a validly signed token that belongs to an existing session.

## Web app

`apps/web` has its own `package.json`.

- **Students** see open tests and past results, take a timed test (answer sheet navigator, mark for review,
  keyboard shortcuts, answers kept if the page reloads), then review the marked answer sheet with explanations and a
  breakdown by topic.
- **Teachers** write tests (questions with an answer key and explanations, time, marking), publish them, and read
  the class answer sheet: every student's answers to every question, the share of the class that got each one right,
  and the hardest question.

```bash
cd apps/web
npm install
npm run dev     # http://localhost:5173, API calls proxied to the live gateway
API_TARGET=http://localhost:8000 npm run dev   # or to a local gateway
npm test
npm run build   # static files in apps/web/dist
```

In production the built files are served by the same Caddy that fronts the gateway: `/`, `/login`, `/tests/*`,
`/results/*`, `/teach/*` and `/assets/*` are the app, everything else goes to the API, so the app needs no CORS setup.

## Tests

```bash
npm test                    # backend (Jest)
npm --prefix apps/web test  # web app (Vitest)
```
