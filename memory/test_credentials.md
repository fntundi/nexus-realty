# Test Credentials

## Demo user (auto-seeded by `GET /api/auth/me` on first call)
- email: `demo@nexusrealty.local`
- password: `demo123`
- role: `agent`

The original Base44 SDK was configured with `requiresAuth: false`, so when no
JWT token is supplied `/api/auth/me` returns this demo user. This keeps the UI
fully functional without forcing a login.

## Self-service registration
Any user can call `POST /api/auth/register` with `{email, password, full_name?}`
to obtain a JWT token. Subsequent calls with `Authorization: Bearer <token>`
return that user instead of the demo user.

## PostgreSQL (local & docker-compose)
- host: `postgres` (within docker-compose) / `localhost` (preview env)
- db: `nexus_realty`
- user: `nexus`
- password: `nexus_password`

All credentials are sourced from `.env` (see `.env.example`).
