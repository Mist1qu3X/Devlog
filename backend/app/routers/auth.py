"""Регистрация и вход пользователей."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import auth as auth_utils
from app.database import get_db
from app.models import User
from app.schemas import Token, UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    # Проверяем, что имя и email ещё не заняты
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Имя пользователя уже занято")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    user = User(
        username=data.username,
        email=data.email,
        password_hash=auth_utils.hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth_utils.create_access_token(user.id)
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    """Вход по имени пользователя и паролю (форма OAuth2: username + password)."""
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not auth_utils.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль",
        )

    token = auth_utils.create_access_token(user.id)
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(auth_utils.get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_me(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_utils.get_current_user),
):
    """Обновление своего профиля: имя пользователя и/или аватар."""
    if data.username is not None and data.username != current_user.username:
        taken = db.query(User).filter(User.username == data.username).first()
        if taken:
            raise HTTPException(status_code=400, detail="Имя пользователя уже занято")
        current_user.username = data.username

    if data.avatar_url is not None:
        # Пустая строка означает «убрать аватар». Ограничиваем размер картинки.
        if data.avatar_url and len(data.avatar_url) > 800_000:
            raise HTTPException(status_code=400, detail="Слишком большая картинка")
        current_user.avatar_url = data.avatar_url or None

    db.commit()
    db.refresh(current_user)
    return current_user
