"""Наполняет БД тестовыми данными (демо-пользователи, посты, теги, комментарии).

Запуск:  python seed.py
Повторный запуск ничего не дублирует — если пользователь уже есть, скрипт выходит.
"""
from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models import Comment, Post, Tag, User

Base.metadata.create_all(bind=engine)


def main():
    db = SessionLocal()
    try:
        if db.query(User).first():
            print("В базе уже есть данные — пропускаю наполнение.")
            return

        # Администратор (логин: admin, пароль: admin123)
        admin = User(username="admin", email="admin@example.com",
                     password_hash=hash_password("admin123"), role="admin")
        # Пользователи (пароль у всех: password123)
        alice = User(username="alice", email="alice@example.com",
                     password_hash=hash_password("password123"))
        bob = User(username="bob", email="bob@example.com",
                   password_hash=hash_password("password123"))
        db.add_all([admin, alice, bob])
        db.flush()

        # Теги
        t_python = Tag(name="python")
        t_react = Tag(name="react")
        t_life = Tag(name="жизнь")
        db.add_all([t_python, t_react, t_life])
        db.flush()

        # Посты
        p1 = Post(
            title="Первый пост в блоге",
            content="Привет! Это демонстрационный пост нашей блог-платформы.\n"
                    "Здесь можно писать статьи, ставить теги и оставлять комментарии.",
            author_id=alice.id,
            tags=[t_python, t_life],
        )
        p2 = Post(
            title="Почему я люблю React",
            content="React делает создание интерфейсов простым и предсказуемым. "
                    "Компонентный подход — это удобно.",
            author_id=bob.id,
            tags=[t_react],
        )
        db.add_all([p1, p2])
        db.flush()

        # Комментарии
        db.add_all([
            Comment(content="Отличный старт!", post_id=p1.id, author_id=bob.id),
            Comment(content="Согласен, React топ.", post_id=p2.id, author_id=alice.id),
        ])

        # Лайки (пользователь ↔ пост)
        p1.liked_by = [bob, admin]
        p2.liked_by = [alice]

        db.commit()
        print("Тестовые данные добавлены.")
        print("Админ:       admin / admin123")
        print("Демо-логины: alice / bob, пароль: password123")
    finally:
        db.close()


if __name__ == "__main__":
    main()
