-- ============================================================
--  Схема базы данных блог-платформы (PostgreSQL)
--  Соответствует ORM-моделям в app/models.py.
--  Приложение создаёт таблицы автоматически через SQLAlchemy,
--  этот файл — справочная/эталонная схема для отчётов ПЗ №3–№4
--  и для ручного развёртывания БД.
-- ============================================================

-- Создание базы данных (выполнять от суперпользователя, вне этого файла):
--   CREATE DATABASE blog_db;

-- ---------- Пользователи ----------
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,          -- bcrypt-хеш, не сам пароль
    role          VARCHAR(20)  NOT NULL DEFAULT 'user',  -- 'user' или 'admin'
    avatar_url    TEXT,                            -- картинка-аватар (data URL) или NULL
    created_at    TIMESTAMP    NOT NULL DEFAULT now()
);

-- ---------- Посты ----------
CREATE TABLE IF NOT EXISTS posts (
    id         SERIAL PRIMARY KEY,
    title      VARCHAR(200) NOT NULL,
    content    TEXT         NOT NULL,
    author_id  INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at TIMESTAMP    NOT NULL DEFAULT now()
);

-- ---------- Комментарии ----------
CREATE TABLE IF NOT EXISTS comments (
    id         SERIAL PRIMARY KEY,
    content    TEXT      NOT NULL,
    post_id    INTEGER   NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id  INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------- Теги ----------
CREATE TABLE IF NOT EXISTS tags (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- ---------- Связь постов и тегов (многие-ко-многим) ----------
CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- ---------- Лайки постов (многие-ко-многим: пользователь ↔ пост) ----------
CREATE TABLE IF NOT EXISTS post_likes (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, post_id)
);

-- ---------- Личные чаты ----------
CREATE TABLE IF NOT EXISTS conversations (
    id                 SERIAL PRIMARY KEY,
    participant_one_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_two_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at         TIMESTAMP NOT NULL DEFAULT now(),
    updated_at         TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_conversation_participants UNIQUE (participant_one_id, participant_two_id),
    CONSTRAINT ck_conversation_participant_order CHECK (participant_one_id < participant_two_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id              SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL DEFAULT '',
    image_url       TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);

-- Совместимость с БД, где таблица сообщений была создана до поддержки изображений.
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ---------- Индексы для ускорения частых запросов ----------
CREATE INDEX IF NOT EXISTS idx_posts_author_id     ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at     ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id     ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id   ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id     ON post_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id   ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_one_id ON conversations(participant_one_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_two_id ON conversations(participant_two_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
