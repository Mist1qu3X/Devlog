"""Публичные профили пользователей."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Post, User
from app.schemas import PostListItem, ProfileOut, UserOut

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/{username}", response_model=ProfileOut)
def get_profile(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    posts = (
        db.query(Post)
        .options(joinedload(Post.author), joinedload(Post.tags),
                 joinedload(Post.comments), joinedload(Post.liked_by))
        .filter(Post.author_id == user.id)
        .order_by(Post.created_at.desc())
        .all()
    )

    items = []
    likes_received = 0
    for p in posts:
        item = PostListItem.model_validate(p)
        item.comments_count = len(p.comments)
        item.likes_count = len(p.liked_by)
        likes_received += len(p.liked_by)
        items.append(item)

    return ProfileOut(
        user=UserOut.model_validate(user),
        posts=items,
        posts_count=len(posts),
        comments_count=len(user.comments),
        likes_received=likes_received,
    )
