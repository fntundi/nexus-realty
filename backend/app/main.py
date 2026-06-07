"""FastAPI application entry."""
from contextlib import asynccontextmanager
from typing import AsyncIterator, List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import Base, engine
from .auth import router as auth_router
from .entities import router as entities_router
from .functions import router as functions_router
from .public import router as public_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # In production rely solely on `alembic upgrade head` (run during container
    # startup) for schema changes. The metadata.create_all call below is a
    # dev-mode convenience and is a no-op when all tables already exist.
    if settings.ENVIRONMENT != "production":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield


def _build_cors_origins(value: str) -> List[str]:
    if value == "*":
        return ["*"]
    return [o.strip() for o in value.split(",") if o.strip()]


app = FastAPI(title="Nexus Realty API", version="1.0.0", lifespan=lifespan)

origins: List[str] = _build_cors_origins(settings.CORS_ORIGINS)

# Per the CORS spec, allow_credentials=True is incompatible with a wildcard
# allow_origins list. We auto-disable credentials when CORS is fully open so
# browsers don't silently reject every cross-origin request.
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public_router)
app.include_router(auth_router)
app.include_router(entities_router)
app.include_router(functions_router)


@app.get("/")
async def root() -> dict:
    return {"service": "Nexus Realty API", "status": "ok"}
