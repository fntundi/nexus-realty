"""Lightweight auth used by the nexus realty frontend.

Provides /api/auth/me and /api/auth/login. Auth is optional (requiresAuth=false
in the SDK), so /me returns a sensible default user even without a token.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .database import get_db
from .models import User

settings = get_settings()
router = APIRouter(prefix="/api/auth", tags=["auth"])

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


def _create_token(sub: str) -> str:
    payload = {
        "sub": sub,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.APP_SECRET_KEY, algorithm=ALGORITHM)


def _decode_token(token: str) -> Optional[str]:
    try:
        data = jwt.decode(token, settings.APP_SECRET_KEY, algorithms=[ALGORITHM])
        return data.get("sub")
    except JWTError:
        return None


async def current_user_optional(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip()
    sub = _decode_token(token)
    if not sub:
        return None
    res = await db.execute(select(User).where(User.email == sub))
    return res.scalar_one_or_none()


async def current_user_required(
    user: Optional[User] = Depends(current_user_optional),
) -> User:
    if not user:
        raise HTTPException(401, "Authentication required")
    return user


# --- Schemas
class LoginPayload(BaseModel):
    email: EmailStr
    password: str


class RegisterPayload(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


# --- Routes
@router.post("/register")
async def register(payload: RegisterPayload, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == payload.email))
    if res.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")
    user = User(
        email=payload.email,
        full_name=payload.full_name or payload.email.split("@")[0],
        hashed_password=pwd_ctx.hash(payload.password),
        role="user",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = _create_token(user.email)
    return {"token": token, "user": user.to_dict()}


@router.post("/login")
async def login(payload: LoginPayload, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == payload.email))
    user = res.scalar_one_or_none()
    if not user or not user.hashed_password or not pwd_ctx.verify(
        payload.password, user.hashed_password
    ):
        raise HTTPException(401, "Invalid credentials")
    token = _create_token(user.email)
    return {"token": token, "user": user.to_dict()}


@router.get("/me")
async def me(
    user: Optional[User] = Depends(current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Return current user. If unauthenticated, returns a default guest user
    (matches the SDK's requiresAuth=false behaviour in the original app)."""
    if user:
        return user.to_dict()
    # Fall back to a default demo user so the existing UI works without login.
    res = await db.execute(select(User).where(User.email == "demo@nexusrealty.local"))
    demo = res.scalar_one_or_none()
    if not demo:
        demo = User(
            email="demo@nexusrealty.local",
            full_name="Demo Agent",
            role="agent",
            hashed_password=pwd_ctx.hash("demo123"),
            extra={"is_demo": True},
        )
        db.add(demo)
        await db.commit()
        await db.refresh(demo)
    return demo.to_dict()


@router.post("/logout")
async def logout():
    return {"success": True}
