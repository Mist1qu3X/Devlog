"""ORM-модели блог-платформы.

Сущности и связи:
  User  1 --- N  Post        (у пользователя много постов)
  User  1 --- N  Comment     (у пользователя много комментариев)
  Post  1 --- N  Comment     (у поста много комментариев)
  Post  N --- M  Tag         (пост имеет много тегов, тег у многих постов)
  User  N --- M  Post        (лайки: пользователь лайкает много постов)
"""
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    CheckConstraint,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base

# Связующая таблица для отношения "многие-ко-многим" между постами и тегами
post_tags = Table(
    "post_tags",
    Base.metadata,
    Column("post_id", ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

# Связующая таблица "лайки": какой пользователь лайкнул какой пост
post_likes = Table(
    "post_likes",
    Base.metadata,
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("post_id", ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    # Роль пользователя: "user" (обычный) или "admin" (администратор)
    role = Column(String(20), nullable=False, server_default="user")
    # Аватар — картинка в виде data URL (base64) либо NULL (тогда рисуем инициал)
    avatar_url = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    liked_posts = relationship("Post", secondary=post_likes, back_populates="liked_by")


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=datetime.utcnow, nullable=False)

    author = relationship("User", back_populates="posts")
    comments = relationship(
        "Comment", back_populates="post", cascade="all, delete-orphan"
    )
    tags = relationship("Tag", secondary=post_tags, back_populates="posts")
    liked_by = relationship("User", secondary=post_likes, back_populates="liked_posts")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    post_id = Column(
        Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    post = relationship("Post", back_populates="comments")
    author = relationship("User", back_populates="comments")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)

    posts = relationship("Post", secondary=post_tags, back_populates="tags")


class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (
        UniqueConstraint(
            "participant_one_id", "participant_two_id", name="uq_conversation_participants"
        ),
        CheckConstraint(
            "participant_one_id < participant_two_id", name="ck_conversation_participant_order"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    participant_one_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    participant_two_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), nullable=False)

    participant_one = relationship("User", foreign_keys=[participant_one_id])
    participant_two = relationship("User", foreign_keys=[participant_two_id])
    messages = relationship(
        "ChatMessage", back_populates="conversation", cascade="all, delete-orphan"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sender_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content = Column(Text, nullable=False)
    image_url = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User")
