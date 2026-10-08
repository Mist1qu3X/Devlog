"""Подключение к PostgreSQL через SQLAlchemy."""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

engine = create_engine(settings.DATABASE_URL, echo=settings.DEBUG, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Базовый класс для всех ORM-моделей."""
    pass


def get_db():
    """Зависимость FastAPI: выдаёт сессию БД и закрывает её после запроса."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
