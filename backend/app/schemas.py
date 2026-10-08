"""Pydantic-схемы для валидации запросов и формирования ответов API."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------- Пользователи / аутентификация ----------
class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    role: str
    avatar_url: Optional[str] = None
    created_at: datetime


class UserUpdate(BaseModel):
    username: Optional[str] = Field(default=None, min_length=3, max_length=50)
    avatar_url: Optional[str] = None   # data URL картинки; пустая строка = убрать


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Теги ----------
class TagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class TagWithCount(BaseModel):
    id: int
    name: str
    count: int = 0


# ---------- Комментарии ----------
class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    created_at: datetime
    author: UserOut


# ---------- Личные чаты ----------
class ChatMessageCreate(BaseModel):
    content: str = Field(default="", max_length=5000)
    image_url: Optional[str] = Field(default=None, max_length=7_000_000)


class ChatParticipantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    avatar_url: Optional[str] = None


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    image_url: Optional[str] = None
    created_at: datetime
    sender: ChatParticipantOut


class ChatSummary(BaseModel):
    id: int
    partner: ChatParticipantOut
    last_message: Optional[str] = None
    updated_at: datetime


# ---------- Посты ----------
class PostCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    tags: List[str] = Field(default_factory=list)


class PostUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    content: Optional[str] = Field(default=None, min_length=1)
    tags: Optional[List[str]] = None


class PostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    created_at: datetime
    updated_at: datetime
    author: UserOut
    tags: List[TagOut] = []
    likes_count: int = 0
    liked_by_me: bool = False
    comments_count: int = 0


class PostListItem(BaseModel):
    """Укороченная версия поста для списка (без полного текста)."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: datetime
    author: UserOut
    tags: List[TagOut] = []
    comments_count: int = 0
    likes_count: int = 0
    liked_by_me: bool = False


# ---------- Профиль пользователя ----------
class ProfileOut(BaseModel):
    user: UserOut
    posts: List[PostListItem] = []
    posts_count: int = 0
    comments_count: int = 0
    likes_received: int = 0


# ---------- Админ-панель ----------
class UserAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    role: str
    avatar_url: Optional[str] = None
    created_at: datetime
    posts_count: int = 0
    comments_count: int = 0


class AdminStats(BaseModel):
    users_count: int
    posts_count: int
    comments_count: int
    tags_count: int
    likes_count: int
    posts_per_day: List[dict]   # [{"date": "2026-09-23", "count": 3}, ...]
    top_tags: List[dict]        # [{"name": "python", "count": 5}, ...]
    top_authors: List[dict]     # [{"username": "alice", "count": 4}, ...]
