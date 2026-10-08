"""Административная панель: статистика и управление пользователями.

Все эндпоинты доступны только пользователям с ролью "admin".
"""
from collections import Counter
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.database import get_db
from app.models import Comment, Post, Tag, User, post_likes
from app.schemas import AdminStats, UserAdminOut

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStats)
def get_stats(db: Session = Depends(get_db), _admin: User = Depends(get_current_admin)):
    users_count = db.query(User).count()
    posts_count = db.query(Post).count()
    comments_count = db.query(Comment).count()
    tags_count = db.query(Tag).count()
    likes_count = db.query(post_likes).count()

    # Посты по дням (за всё время)
    posts = db.query(Post).all()
    per_day = Counter(p.created_at.strftime("%Y-%m-%d") for p in posts)
    posts_per_day = [
        {"date": d, "count": c} for d, c in sorted(per_day.items())
    ]

    # Топ тегов по числу постов
    tag_counter = Counter()
    for p in posts:
        for t in p.tags:
            tag_counter[t.name] += 1
    top_tags = [
        {"name": n, "count": c} for n, c in tag_counter.most_common(5)
    ]

    # Топ авторов по числу постов
    author_counter = Counter(p.author.username for p in posts)
    top_authors = [
        {"username": n, "count": c} for n, c in author_counter.most_common(5)
    ]

    return AdminStats(
        users_count=users_count,
        posts_count=posts_count,
        comments_count=comments_count,
        tags_count=tags_count,
        likes_count=likes_count,
        posts_per_day=posts_per_day,
        top_tags=top_tags,
        top_authors=top_authors,
    )


@router.get("/users", response_model=List[UserAdminOut])
def list_users(db: Session = Depends(get_db), _admin: User = Depends(get_current_admin)):
    users = db.query(User).order_by(User.created_at.asc()).all()
    result = []
    for u in users:
        item = UserAdminOut.model_validate(u)
        item.posts_count = len(u.posts)
        item.comments_count = len(u.comments)
        result.append(item)
    return result


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Нельзя удалить другого администратора")
    db.delete(user)
    db.commit()
