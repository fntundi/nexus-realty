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
from typing import Any, Optional
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy import select, func, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db
from .models import EntityRecord
from .auth import current_user_optional

router = APIRouter(prefix="/api/entities", tags=["entities"])


def _apply_filter(stmt, entity_type: str, criteria: dict):
    stmt = stmt.where(EntityRecord.entity_type == entity_type)
    if not criteria:
        return stmt
    for key, val in criteria.items():
        if key == "id":
            if isinstance(val, dict) and "$in" in val:
                stmt = stmt.where(EntityRecord.id.in_(val["$in"]))
            else:
                stmt = stmt.where(EntityRecord.id == val)
            continue
        if key == "created_by":
            if isinstance(val, dict) and "$in" in val:
                stmt = stmt.where(EntityRecord.created_by.in_(val["$in"]))
            else:
                stmt = stmt.where(EntityRecord.created_by == val)
            continue
        # JSONB field operators
        col = EntityRecord.data[key]
        if isinstance(val, dict):
            if "$in" in val:
                # use ANY of list
                stmt = stmt.where(col.astext.in_([str(v) for v in val["$in"]]))
            elif "$nin" in val:
                stmt = stmt.where(~col.astext.in_([str(v) for v in val["$nin"]]))
            elif any(op in val for op in ("$gt", "$gte", "$lt", "$lte")):
                from sqlalchemy import cast, Numeric, or_
                # use numeric cast for ordering when comparing to a number
                for op, sql_op in (("$gt", ">"), ("$gte", ">="), ("$lt", "<"), ("$lte", "<=")):
                    if op not in val:
                        continue
                    rhs = val[op]
                    if isinstance(rhs, (int, float)):
                        numeric_col = cast(col.astext, Numeric)
                        if sql_op == ">":
                            stmt = stmt.where(numeric_col > rhs)
                        elif sql_op == ">=":
                            stmt = stmt.where(numeric_col >= rhs)
                        elif sql_op == "<":
                            stmt = stmt.where(numeric_col < rhs)
                        elif sql_op == "<=":
                            stmt = stmt.where(numeric_col <= rhs)
                    else:
                        if sql_op == ">":
                            stmt = stmt.where(col.astext > str(rhs))
                        elif sql_op == ">=":
                            stmt = stmt.where(col.astext >= str(rhs))
                        elif sql_op == "<":
                            stmt = stmt.where(col.astext < str(rhs))
                        elif sql_op == "<=":
                            stmt = stmt.where(col.astext <= str(rhs))
            elif "$ne" in val:
                stmt = stmt.where(col.astext != str(val["$ne"]))
            elif "$contains" in val:
                stmt = stmt.where(col.astext.ilike(f"%{val['$contains']}%"))
        elif val is None:
            stmt = stmt.where(col.is_(None))
        elif isinstance(val, bool):
            stmt = stmt.where(col.astext == str(val).lower())
        else:
            stmt = stmt.where(col.astext == str(val))
    return stmt


def _apply_sort(stmt, sort: Optional[str]):
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


@router.get("/{entity}")
async def list_entities(
    entity: str,
    _sort: Optional[str] = Query(None),
    _limit: Optional[int] = Query(None, ge=1, le=10000),
    _skip: Optional[int] = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
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
):
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
async def get_entity(entity: str, record_id: str, db: AsyncSession = Depends(get_db)):
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
):
    payload = dict(body or {})
    payload.pop("id", None)
    payload.pop("created_date", None)
    payload.pop("updated_date", None)
    rec = EntityRecord(
        entity_type=entity,
        data=payload,
        created_by=(user.email if user else payload.get("created_by")),
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
):
    # accept either raw list or {records: [...]}
    items = body.get("records") if isinstance(body, dict) else body
    if not isinstance(items, list):
        raise HTTPException(400, "Expected list of records")
    created = []
    for item in items:
        payload = dict(item or {})
        payload.pop("id", None)
        rec = EntityRecord(
            entity_type=entity,
            data=payload,
            created_by=(user.email if user else payload.get("created_by")),
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
):
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
async def delete_entity(entity: str, record_id: str, db: AsyncSession = Depends(get_db)):
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
async def count_entities(entity: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(func.count(EntityRecord.id)).where(EntityRecord.entity_type == entity)
    )
    return {"count": res.scalar() or 0}
