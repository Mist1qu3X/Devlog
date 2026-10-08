"""Создаёт базу данных blog_db, если её ещё нет.

Подключается к служебной БД postgres и выполняет CREATE DATABASE.
Запуск:  python create_db.py
"""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

from app.config import settings


def main():
    conn = psycopg2.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        dbname="postgres",
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (settings.DB_NAME,))
    if cur.fetchone():
        print(f"База данных '{settings.DB_NAME}' уже существует.")
    else:
        cur.execute(f'CREATE DATABASE "{settings.DB_NAME}"')
        print(f"База данных '{settings.DB_NAME}' создана.")
    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
