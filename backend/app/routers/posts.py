"""CRUD для постов + вложенные комментарии + лайки."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, get_current_user_optional
from app.database import get_db
from app.models import Comment, Post, Tag, User
from app.schemas import (
    CommentCreate,
    CommentOut,
    PostCreate,
    PostListItem,
    PostOut,
    PostUpdate,
)

router = APIRouter(prefix="/api/posts", tags=["posts"])


def _get_or_create_tags(db: Session, names: List[str]) -> List[Tag]:
    """Возвращает существующие теги по имени, недостающие — создаёт."""
    tags = []
    for raw in names:
        name = raw.strip().lower()
        if not name:
            continue
        tag = db.query(Tag).filter(Tag.name == name).first()
        if not tag:
            tag = Tag(name=name)
            db.add(tag)
        tags.append(tag)
    return tags


def _liked_ids(post: Post) -> set:
    return {u.id for u in post.liked_by}


@router.get("", response_model=List[PostListItem])
def list_posts(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    tag: Optional[str] = Query(default=None, description="Фильтр по имени тега"),
    search: Optional[str] = Query(default=None, description="Поиск по заголовку"),
    author: Optional[str] = Query(default=None, description="Фильтр по автору (username)"),
    sort: str = Query(default="new", description="Сортировка: new | popular"),
    skip: int = 0,
    limit: int = Query(default=20, le=100),
):
    query = db.query(Post).options(
        joinedload(Post.author),
        joinedload(Post.tags),
        joinedload(Post.comments),
        joinedload(Post.liked_by),
    )
    if tag:
        query = query.filter(Post.tags.any(Tag.name == tag.strip().lower()))
    if search:
        query = query.filter(Post.title.ilike(f"%{search}%"))
    if author:
        query = query.filter(Post.author.has(User.username == author))

    posts = query.all()

    # Сортировка: по дате или по числу лайков (популярность)
    if sort == "popular":
        posts.sort(key=lambda p: len(p.liked_by), reverse=True)
    else:
        posts.sort(key=lambda p: p.created_at, reverse=True)
    posts = posts[skip:skip + limit]

    result = []
    for p in posts:
        item = PostListItem.model_validate(p)
        item.comments_count = len(p.comments)
        item.likes_count = len(p.liked_by)
        item.liked_by_me = bool(current_user and current_user.id in _liked_ids(p))
        result.append(item)
    return result


@router.get("/{post_id}", response_model=PostOut)
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    post = (
        db.query(Post)
        .options(
            joinedload(Post.author),
            joinedload(Post.tags),
            joinedload(Post.comments),
            joinedload(Post.liked_by),
        )
        .filter(Post.id == post_id)
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")
    out = PostOut.model_validate(post)
    out.likes_count = len(post.liked_by)
    out.comments_count = len(post.comments)
    out.liked_by_me = bool(current_user and current_user.id in _liked_ids(post))
    return out


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(
    data: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = Post(title=data.title, content=data.content, author_id=current_user.id)
    post.tags = _get_or_create_tags(db, data.tags)
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.put("/{post_id}", response_model=PostOut)
def update_post(
    post_id: int,
    data: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")
    if post.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Можно редактировать только свои посты")

    if data.title is not None:
        post.title = data.title
    if data.content is not None:
        post.content = data.content
    if data.tags is not None:
        post.tags = _get_or_create_tags(db, data.tags)

    db.commit()
    db.refresh(post)
    return post


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")
    # Автор или администратор
    if post.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Можно удалять только свои посты")
    db.delete(post)
    db.commit()


# ---------- Лайки ----------
@router.post("/{post_id}/like", response_model=PostOut)
def like_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = (
        db.query(Post)
        .options(joinedload(Post.liked_by), joinedload(Post.author), joinedload(Post.tags))
        .filter(Post.id == post_id)
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")
    if current_user.id not in _liked_ids(post):
        post.liked_by.append(current_user)
        db.commit()
        db.refresh(post)
    out = PostOut.model_validate(post)
    out.likes_count = len(post.liked_by)
    out.comments_count = len(post.comments)
    out.liked_by_me = True
    return out


@router.delete("/{post_id}/like", response_model=PostOut)
def unlike_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = (
        db.query(Post)
        .options(joinedload(Post.liked_by), joinedload(Post.author), joinedload(Post.tags))
        .filter(Post.id == post_id)
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")
    post.liked_by = [u for u in post.liked_by if u.id != current_user.id]
    db.commit()
    db.refresh(post)
    out = PostOut.model_validate(post)
    out.likes_count = len(post.liked_by)
    out.comments_count = len(post.comments)
    out.liked_by_me = False
    return out


# ---------- Комментарии к посту ----------
@router.get("/{post_id}/comments", response_model=List[CommentOut])
def list_comments(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")
    return (
        db.query(Comment)
        .options(joinedload(Comment.author))
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at.asc())
        .all()
    )


@router.post(
    "/{post_id}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
)
def add_comment(
    post_id: int,
    data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")

    comment = Comment(
        content=data.content, post_id=post_id, author_id=current_user.id
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.delete(
    "/{post_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_comment(
    post_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = (
        db.query(Comment)
        .filter(Comment.id == comment_id, Comment.post_id == post_id)
        .first()
    )
    if not comment:
        raise HTTPException(status_code=404, detail="Комментарий не найден")
    # Автор комментария или администратор
    if comment.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Можно удалять только свои комментарии")
    db.delete(comment)
    db.commit()
