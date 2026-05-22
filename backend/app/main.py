"""FastAPI application entry."""
from contextlib import asynccontextmanager
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
async def lifespan(app: FastAPI):
    # Auto-create tables on startup (alembic migrations also available)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="Nexus Realty API", version="1.0.0", lifespan=lifespan)

origins = ["*"] if settings.CORS_ORIGINS == "*" else [
    o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public_router)
app.include_router(auth_router)
app.include_router(entities_router)
app.include_router(functions_router)


@app.get("/")
async def root():
    return {"service": "Nexus Realty API", "status": "ok"}
