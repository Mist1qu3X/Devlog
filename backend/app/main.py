"""Точка входа приложения FastAPI (монолитный backend блог-платформы)."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import Base, engine
from app.routers import admin, auth, chats, posts, tags, users

# Создаём таблицы при старте, если их ещё нет
Base.metadata.create_all(bind=engine)
with engine.begin() as connection:
    connection.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS image_url TEXT"))

app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

# Разрешаем запросы с фронтенда (Vite dev-сервер)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=(
        r"^https?://(localhost|127\.0\.0\.1|192\.168(?:\.\d{1,3}){2}|"
        r"10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})"
        r"(?::\d+)?$"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chats.router)
app.include_router(posts.router)
app.include_router(tags.router)
app.include_router(users.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {"app": settings.APP_NAME, "version": settings.APP_VERSION, "status": "ok"}


@app.get("/api/health")
def health():
    return {"status": "ok"}
