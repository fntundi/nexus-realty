# Nexus Realty — Product Requirements (PRD)

## Original problem statement
> Convert this app without changing any of its features or any of the frontend
> visual components into a REACT/FASTAPI application with a postgresql database
> that can be deployed as a docker-compose suite of containers on the same
> docker network.

Source: <https://github.com/fntundi/nexus-realty.git> — a Base44-hosted React app
(Nexus Realty CRM, real estate intelligence platform).

## Architecture
- **Frontend**: React 18 + Vite + Tailwind + shadcn/ui (visuals unchanged)
- **Backend**: FastAPI + SQLAlchemy async + Alembic migrations
- **Database**: PostgreSQL 16 (JSONB-backed flexible entity store + GIN index)
- **Packaging**: docker-compose (postgres + backend + frontend on `nexus-net`)

The frontend uses a **drop-in shim** (`src/api/base44Client.js`) that exposes the
same surface as `@base44/sdk` and routes calls to the FastAPI backend.

## User personas
- **Real estate agents** — pipeline, deals, contacts, tasks
- **Lenders / borrowers** — loan eligibility, portals
- **Developers / builders** — project showcases, milestones
- **Buyers / clients** — search, viewings, status

## Core requirements
- Preserve every visual component of the original UI (no design changes)
- Preserve every `base44.entities.*` and `base44.functions.*` API contract
- Store all data in PostgreSQL
- Auth: optional JWT (the SDK was `requiresAuth: false`); `/me` falls back to a demo user
- Production-ready Docker images (healthchecks, restart policies, non-root backend user)

## What's been implemented (2026-05-22)
- [x] /app restructured into `frontend/` + `backend/`
- [x] FastAPI backend with:
  - Generic JSONB entity CRUD matching Base44 semantics (`list`, `filter`, `create`, `bulkCreate`, `get`, `update`, `delete`, `count`)
  - 53 function handlers (lead scoring, loan eligibility, market data, etc.) at `/api/functions/{name}`
  - Auth (`/api/auth/register`, `/login`, `/me`, `/logout`) with JWT and demo-user fallback
  - Public settings endpoint matching original SDK contract
  - SQLAlchemy async + Alembic migrations (`alembic upgrade head` runs in container)
- [x] PostgreSQL schema with `entities` table (JSONB + GIN index) + `users` table
- [x] Local Base44 SDK shim (`src/api/base44Client.js`) — drop-in replacement
- [x] AuthContext.jsx adapted to new client
- [x] Vite config rebuilt (without `@base44/vite-plugin`); `yarn start` script added
- [x] Dockerfiles for frontend (nginx) and backend (python:3.11-slim, non-root)
- [x] `docker-compose.yml` with healthchecks, dependencies, named volume, single bridge network
- [x] `.env.example` for production config
- [x] `README.md` rewritten with deploy instructions
- [x] Backend tested end-to-end — 16/16 tests pass
- [x] Numeric `$gt/$lt/$gte/$lte` JSONB operators use proper numeric cast

## Backlog (prioritised)
### P0
- (none)

### P1
- Replace function stubs with real integrations as needed (DocuSign, market-data, AI)
- Add Alembic migration step to skip `Base.metadata.create_all` in production mode

### P2
- Return 201 from create endpoints (REST nit)
- Tighten CORS for credentialed cross-origin deployments
- Move demo-user seeding from `/me` side-effect to startup task

## Future ideas
- Per-entity Pydantic schemas for the most-used entities (Lead, Contact, Property,
  Transaction) — would give automatic validation while keeping JSONB flexibility
  for the long tail.
- Read replicas + connection pooling tuning for high concurrency
