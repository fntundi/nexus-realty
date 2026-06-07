"""Base44-compatible entity CRUD routes.

Matches the @base44/sdk entity API contract:
  - GET /api/entities/{Entity}                  -> list (?_sort, ?_limit, ?_skip)
  - POST /api/entities/{Entity}/filter           -> filter by JSON criteria
  - POST /api/entities/{Entity}                  -> create
  - POST /api/entities/{Entity}/bulk             -> bulk create
  - GET /api/entities/{Entity}/{id}             -> get one
  - PUT /api/entities/{Entity}/{id}             -> update (merge)
  - DELETE /api/entities/{Entity}/{id}          -> delete
"""
from typing import Any, List, Optional
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy import Numeric, asc, cast, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from .database import get_db
from .models import EntityRecord
from .auth import current_user_optional

router = APIRouter(prefix="/api/entities", tags=["entities"])

# --- Filter helpers ----------------------------------------------------------
#
# Each helper takes the in-progress SQL `stmt`, the current JSONB column accessor
# and the user-supplied predicate, and returns the augmented statement. Keeping
# them small + flat makes the per-operator behaviour easy to read and unit-test.
# ---------------------------------------------------------------------------

_NUMERIC_OPS = {
    "$gt": lambda c, v: c > v,
    "$gte": lambda c, v: c >= v,
    "$lt": lambda c, v: c < v,
    "$lte": lambda c, v: c <= v,
}

_STRING_OPS = {
    "$gt": lambda c, v: c > v,
    "$gte": lambda c, v: c >= v,
    "$lt": lambda c, v: c < v,
    "$lte": lambda c, v: c <= v,
}


def _apply_top_level_filter(
    stmt: Select, column, value: Any
) -> Select:
    """Filter on a real column (id, created_by) with optional `$in`."""
    if isinstance(value, dict) and "$in" in value:
        return stmt.where(column.in_(value["$in"]))
    return stmt.where(column == value)


def _apply_in_operator(stmt: Select, col, predicate: dict) -> Select:
    return stmt.where(col.astext.in_([str(v) for v in predicate["$in"]]))


def _apply_nin_operator(stmt: Select, col, predicate: dict) -> Select:
    return stmt.where(~col.astext.in_([str(v) for v in predicate["$nin"]]))


def _apply_range_operators(stmt: Select, col, predicate: dict) -> Select:
    """Apply $gt/$gte/$lt/$lte. Uses numeric cast for numbers, string for rest."""
    for op in ("$gt", "$gte", "$lt", "$lte"):
        if op not in predicate:
            continue
        rhs = predicate[op]
        if isinstance(rhs, (int, float)) and not isinstance(rhs, bool):
            numeric_col = cast(col.astext, Numeric)
            stmt = stmt.where(_NUMERIC_OPS[op](numeric_col, rhs))
        else:
            stmt = stmt.where(_STRING_OPS[op](col.astext, str(rhs)))
    return stmt


def _apply_dict_predicate(stmt: Select, col, predicate: dict) -> Select:
    """Dispatch to the right operator helper based on which keys are present."""
    if "$in" in predicate:
        return _apply_in_operator(stmt, col, predicate)
    if "$nin" in predicate:
        return _apply_nin_operator(stmt, col, predicate)
    if any(op in predicate for op in _NUMERIC_OPS):
        return _apply_range_operators(stmt, col, predicate)
    if "$ne" in predicate:
        return stmt.where(col.astext != str(predicate["$ne"]))
    if "$contains" in predicate:
        return stmt.where(col.astext.ilike(f"%{predicate['$contains']}%"))
    return stmt


def _apply_scalar_predicate(stmt: Select, col, value: Any) -> Select:
    """Equality predicate for primitives + None handling."""
    if value is None:
        return stmt.where(col.is_(None))
    if isinstance(value, bool):
        return stmt.where(col.astext == str(value).lower())
    return stmt.where(col.astext == str(value))


def _apply_filter(stmt: Select, entity_type: str, criteria: Optional[dict]) -> Select:
    stmt = stmt.where(EntityRecord.entity_type == entity_type)
    if not criteria:
        return stmt
    for key, value in criteria.items():
        if key == "id":
            stmt = _apply_top_level_filter(stmt, EntityRecord.id, value)
            continue
        if key == "created_by":
            stmt = _apply_top_level_filter(stmt, EntityRecord.created_by, value)
            continue
        col = EntityRecord.data[key]
        if isinstance(value, dict):
            stmt = _apply_dict_predicate(stmt, col, value)
        else:
            stmt = _apply_scalar_predicate(stmt, col, value)
    return stmt


def _apply_sort(stmt: Select, sort: Optional[str]) -> Select:
    if not sort:
        return stmt.order_by(desc(EntityRecord.created_at))
    field = sort.lstrip("-")
    direction = desc if sort.startswith("-") else asc
    if field in ("created_date", "created_at"):
        return stmt.order_by(direction(EntityRecord.created_at))
    if field in ("updated_date", "updated_at"):
        return stmt.order_by(direction(EntityRecord.updated_at))
    if field == "id":
        return stmt.order_by(direction(EntityRecord.id))
    return stmt.order_by(direction(EntityRecord.data[field].astext))


# --- Routes ------------------------------------------------------------------


@router.get("/{entity}")
async def list_entities(
    entity: str,
    _sort: Optional[str] = Query(None),
    _limit: Optional[int] = Query(None, ge=1, le=10000),
    _skip: Optional[int] = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> List[dict]:
    stmt = select(EntityRecord).where(EntityRecord.entity_type == entity)
    stmt = _apply_sort(stmt, _sort)
    if _skip:
        stmt = stmt.offset(_skip)
    if _limit:
        stmt = stmt.limit(_limit)
    res = await db.execute(stmt)
    return [r.to_dict() for r in res.scalars().all()]


@router.post("/{entity}/filter")
async def filter_entities(
    entity: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
) -> List[dict]:
    criteria = body.get("criteria") or {}
    sort = body.get("sort")
    limit = body.get("limit")
    skip = body.get("skip", 0)
    stmt = select(EntityRecord)
    stmt = _apply_filter(stmt, entity, criteria)
    stmt = _apply_sort(stmt, sort)
    if skip:
        stmt = stmt.offset(skip)
    if limit:
        stmt = stmt.limit(limit)
    res = await db.execute(stmt)
    return [r.to_dict() for r in res.scalars().all()]


@router.get("/{entity}/{record_id}")
async def get_entity(
    entity: str, record_id: str, db: AsyncSession = Depends(get_db)
) -> dict:
    stmt = select(EntityRecord).where(
        EntityRecord.entity_type == entity, EntityRecord.id == record_id
    )
    res = await db.execute(stmt)
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(404, f"{entity} not found")
    return row.to_dict()


@router.post("/{entity}")
async def create_entity(
    entity: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user_optional),
) -> dict:
    payload = dict(body or {})
    payload.pop("id", None)
    payload.pop("created_date", None)
    payload.pop("updated_date", None)
    # Only authenticated callers can set created_by — prevents spoofing.
    payload.pop("created_by", None)
    rec = EntityRecord(
        entity_type=entity,
        data=payload,
        created_by=(user.email if user else None),
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return rec.to_dict()


@router.post("/{entity}/bulk")
async def bulk_create(
    entity: str,
    body: Any = Body(...),
    db: AsyncSession = Depends(get_db),
    user=Depends(current_user_optional),
) -> List[dict]:
    # accept either raw list or {records: [...]}
    items = body.get("records") if isinstance(body, dict) else body
    if not isinstance(items, list):
        raise HTTPException(400, "Expected list of records")
    created: List[EntityRecord] = []
    for item in items:
        payload = dict(item or {})
        payload.pop("id", None)
        payload.pop("created_by", None)
        rec = EntityRecord(
            entity_type=entity,
            data=payload,
            created_by=(user.email if user else None),
        )
        db.add(rec)
        created.append(rec)
    await db.commit()
    for rec in created:
        await db.refresh(rec)
    return [r.to_dict() for r in created]


@router.put("/{entity}/{record_id}")
async def update_entity(
    entity: str, record_id: str, body: dict, db: AsyncSession = Depends(get_db)
) -> dict:
    stmt = select(EntityRecord).where(
        EntityRecord.entity_type == entity, EntityRecord.id == record_id
    )
    res = await db.execute(stmt)
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(404, f"{entity} not found")
    merged = dict(row.data or {})
    update = dict(body or {})
    update.pop("id", None)
    update.pop("created_date", None)
    merged.update(update)
    row.data = merged
    await db.commit()
    await db.refresh(row)
    return row.to_dict()


@router.delete("/{entity}/{record_id}")
async def delete_entity(
    entity: str, record_id: str, db: AsyncSession = Depends(get_db)
) -> dict:
    stmt = select(EntityRecord).where(
        EntityRecord.entity_type == entity, EntityRecord.id == record_id
    )
    res = await db.execute(stmt)
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(404, f"{entity} not found")
    await db.delete(row)
    await db.commit()
    return {"success": True, "id": record_id}


@router.get("/{entity}/_meta/count")
async def count_entities(entity: str, db: AsyncSession = Depends(get_db)) -> dict:
    res = await db.execute(
        select(func.count(EntityRecord.id)).where(EntityRecord.entity_type == entity)
    )
    return {"count": res.scalar() or 0}
