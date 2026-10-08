"""Список тегов со счётчиком постов (для облака тегов / фильтра на фронтенде)."""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Tag, post_tags
from app.schemas import TagWithCount

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.get("", response_model=List[TagWithCount])
def list_tags(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(default=None, description="Поиск по имени тега"),
    limit: Optional[int] = Query(default=None, description="Ограничение количества"),
):
    """Теги, отсортированные по популярности (числу постов).

    Поддерживает поиск по подстроке и ограничение количества — фронтенд
    показывает топ-N популярных, а остальные ищет через параметр search.
    """
    q = (
        db.query(Tag.id, Tag.name, func.count(post_tags.c.post_id).label("count"))
        .outerjoin(post_tags, post_tags.c.tag_id == Tag.id)
        .group_by(Tag.id, Tag.name)
        .order_by(desc("count"), Tag.name.asc())
    )
    if search:
        q = q.filter(Tag.name.ilike(f"%{search.strip().lower()}%"))
    if limit:
        q = q.limit(limit)
    return [TagWithCount(id=r.id, name=r.name, count=r.count) for r in q.all()]
