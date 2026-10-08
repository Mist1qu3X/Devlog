"""Мягкая миграция существующей БД под новый функционал.

Добавляет столбец users.role и таблицу post_likes, если их ещё нет,
и создаёт учётную запись администратора. Данные не теряются.

Запуск:  python migrate.py
"""
from sqlalchemy import inspect, text

from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models import User


def column_exists(table: str, column: str) -> bool:
    insp = inspect(engine)
    return any(c["name"] == column for c in insp.get_columns(table))


def main():
    # На случай, если БД совсем пустая — создаём все таблицы.
    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:
        # 1) столбец role в users
        if not column_exists("users", "role"):
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'"
            ))
            print("Добавлен столбец users.role")
        else:
            print("Столбец users.role уже существует")

        # 1b) столбец avatar_url в users
        if not column_exists("users", "avatar_url"):
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url TEXT"))
            print("Добавлен столбец users.avatar_url")
        else:
            print("Столбец users.avatar_url уже существует")

        # 2) таблица post_likes
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS post_likes (
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                PRIMARY KEY (user_id, post_id)
            )
        """))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id)"
        ))
        print("Таблица post_likes готова")

    # 3) учётная запись администратора
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if admin:
            if admin.role != "admin":
                admin.role = "admin"
                db.commit()
            print("Администратор уже существует (admin)")
        else:
            admin = User(
                username="admin",
                email="admin@example.com",
                password_hash=hash_password("admin123"),
                role="admin",
            )
            db.add(admin)
            db.commit()
            print("Создан администратор: admin / admin123")
    finally:
        db.close()

    print("Миграция завершена.")


if __name__ == "__main__":
    main()
