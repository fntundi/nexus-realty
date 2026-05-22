# Nexus Realty — React / FastAPI / PostgreSQL

A production-ready conversion of the original Base44-hosted Nexus Realty application
into a self-contained stack:

| Tier      | Tech                                        |
|-----------|---------------------------------------------|
| Frontend  | React 18 + Vite + Tailwind + shadcn/ui      |
| Backend   | FastAPI + SQLAlchemy (async) + Alembic      |
| Database  | PostgreSQL 16 (JSONB-backed flexible store) |
| Packaging | docker-compose (3 services on one network) |

**The frontend's visual components are unchanged** — the conversion is purely
infrastructural. The original `@base44/sdk` calls are routed through a tiny
local shim (`src/api/base44Client.js`) that talks to our FastAPI backend.

---

## Quick start (docker-compose)

```bash
cp .env.example .env
# (edit .env to set APP_SECRET_KEY etc.)
docker compose up -d --build
```

Then open:

- **Frontend**: <http://localhost:3000>
- **Backend API docs**: <http://localhost:8001/docs>
- **Health**: <http://localhost:8001/api/health>

All three services run on a shared `nexus-net` bridge network, so the
frontend's nginx proxies `/api/*` directly to `backend:8001` without exposing
anything else externally. Postgres is reachable only via the docker network
(its port mapping is provided for convenience and can be removed in stricter
environments).

## Architecture

```
                   ┌──────────────────────────┐
   browser ───►   │  nginx (frontend:80)     │── /api/* ─►  backend (FastAPI :8001) ──► postgres :5432
                   │  serves built React SPA  │
                   └──────────────────────────┘
```

### Generic entity model
The original Base44 app uses ~47 different entity types with loosely-defined
schemas. To preserve full functional parity, the backend persists every entity
in a single `entities` table using a JSONB column. This keeps the API
contract identical to Base44 (`list`, `filter`, `create`, `update`, `delete`,
`bulkCreate`) while giving us full PostgreSQL queryability via JSONB
operators + a GIN index. Migrations are managed by Alembic.

### Function endpoints
The original 52 server-side `base44.functions.*` calls are implemented as
FastAPI routes under `/api/functions/{name}`. Lead scoring, document
categorisation and loan-eligibility checks are implemented; integrations
(DocuSign, telephony, market data, AI) return well-shaped stub responses so
the UI continues to work even without the original third-party credentials.
Plug your own provider into `app/functions.py` to enable them.

## Local development (no docker)

```bash
# Terminal 1 — PostgreSQL (any local 16+ instance)
createdb nexus_realty

# Terminal 2 — Backend
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8001

# Terminal 3 — Frontend
cd frontend
yarn install
yarn start
```

## Environment variables

See `.env.example`. Every URL, port and credential is sourced from env vars —
no hard-coded defaults inside the Docker images.

## Deployment notes

* All containers declare `restart: unless-stopped` and emit healthchecks.
* The backend image runs as a non-root user.
* Alembic runs on every backend startup, so schema migrations apply
  automatically when you ship a new image.
* The frontend bundle is built with an **empty** `VITE_API_BASE_URL` so the
  React app issues same-origin requests, which the nginx layer proxies to the
  backend container.

## API summary

| Endpoint                                               | Purpose                                  |
|--------------------------------------------------------|------------------------------------------|
| `GET  /api/health`                                     | Liveness probe                            |
| `GET  /api/apps/public/prod/public-settings/by-id/{id}`| App settings consumed by `AuthContext`    |
| `GET  /api/auth/me`                                    | Current user (returns demo if no token)   |
| `POST /api/auth/login`                                 | Email + password login (JWT)              |
| `POST /api/auth/register`                              | Self-service registration                 |
| `GET  /api/entities/{Entity}`                          | List (`?_sort=-created_date&_limit=50`)   |
| `POST /api/entities/{Entity}/filter`                   | Mongo-style filter (`$in`, `$gt`, …)      |
| `POST /api/entities/{Entity}`                          | Create one                                |
| `POST /api/entities/{Entity}/bulk`                     | Bulk create                               |
| `GET /api/entities/{Entity}/{id}`                      | Read one                                  |
| `PUT /api/entities/{Entity}/{id}`                      | Merge update                              |
| `DELETE /api/entities/{Entity}/{id}`                   | Delete                                    |
| `POST /api/functions/{name}`                           | Invoke a server-side function             |
