"""ORM models for the generic entity store and users."""
from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, DateTime, Index, Boolean, Text
from sqlalchemy.dialects.postgresql import JSONB
from .database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _gen_id() -> str:
    return uuid.uuid4().hex


class EntityRecord(Base):
    """Generic JSONB store for all Base44-style entities."""
    __tablename__ = "entities"

    id = Column(String(64), primary_key=True, default=_gen_id)
    entity_type = Column(String(120), index=True, nullable=False)
    data = Column(JSONB, nullable=False, default=dict)
    created_by = Column(String(255), index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    __table_args__ = (
        Index("ix_entities_type_created", "entity_type", "created_at"),
        Index("ix_entities_data_gin", "data", postgresql_using="gin"),
    )

    def to_dict(self) -> dict:
        d = dict(self.data or {})
        d["id"] = self.id
        d["created_date"] = self.created_at.isoformat() if self.created_at else None
        d["updated_date"] = self.updated_at.isoformat() if self.updated_at else None
        if self.created_by:
            d["created_by"] = self.created_by
        return d


class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, default=_gen_id)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=True)
    role = Column(String(64), default="user", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    extra = Column(JSONB, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name or self.email.split("@")[0],
            "role": self.role,
            "is_active": self.is_active,
            "created_date": self.created_at.isoformat() if self.created_at else None,
            **(self.extra or {}),
        }
