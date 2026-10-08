"""Личные сообщения между пользователями."""
import base64
import binascii
import re
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import ChatMessage, Conversation, User
from app.schemas import ChatMessageCreate, ChatMessageOut, ChatParticipantOut, ChatSummary

router = APIRouter(prefix="/api/chats", tags=["chats"])
MAX_IMAGE_BYTES = 5 * 1024 * 1024
IMAGE_DATA_URL = re.compile(
    r"^data:image/(?:jpeg|png|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$"
)


def _partner(conversation: Conversation, current_user: User) -> User:
    if conversation.participant_one_id == current_user.id:
        return conversation.participant_two
    return conversation.participant_one


def _get_conversation(
    conversation_id: int, current_user: User, db: Session
) -> Conversation:
    conversation = (
        db.query(Conversation)
        .options(
            joinedload(Conversation.participant_one),
            joinedload(Conversation.participant_two),
        )
        .filter(
            Conversation.id == conversation_id,
            (
                (Conversation.participant_one_id == current_user.id)
                | (Conversation.participant_two_id == current_user.id)
            ),
        )
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Чат не найден")
    return conversation


@router.get("", response_model=List[ChatSummary])
def list_chats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversations = (
        db.query(Conversation)
        .options(
            joinedload(Conversation.participant_one),
            joinedload(Conversation.participant_two),
        )
        .filter(
            (Conversation.participant_one_id == current_user.id)
            | (Conversation.participant_two_id == current_user.id)
        )
        .order_by(Conversation.updated_at.desc(), Conversation.id.desc())
        .all()
    )

    result = []
    for conversation in conversations:
        last_message = (
            db.query(ChatMessage.content, ChatMessage.image_url.isnot(None))
            .filter(ChatMessage.conversation_id == conversation.id)
            .order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
            .first()
        )
        result.append(
            ChatSummary(
                id=conversation.id,
                partner=ChatParticipantOut.model_validate(_partner(conversation, current_user)),
                last_message=(
                    last_message[0] or ("📷 Фото" if last_message[1] else "")
                    if last_message
                    else None
                ),
                updated_at=conversation.updated_at,
            )
        )
    return result


@router.post("/with/{username}", response_model=ChatSummary, status_code=status.HTTP_200_OK)
def open_chat(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    partner = db.query(User).filter(User.username == username).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if partner.id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя создать чат с самим собой")

    one_id, two_id = sorted((current_user.id, partner.id))
    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.participant_one_id == one_id,
            Conversation.participant_two_id == two_id,
        )
        .first()
    )
    if not conversation:
        conversation = Conversation(
            participant_one_id=one_id,
            participant_two_id=two_id,
        )
        db.add(conversation)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            conversation = (
                db.query(Conversation)
                .filter(
                    Conversation.participant_one_id == one_id,
                    Conversation.participant_two_id == two_id,
                )
                .first()
            )
            if not conversation:
                raise HTTPException(status_code=409, detail="Не удалось открыть чат")
    db.refresh(conversation)
    return ChatSummary(
        id=conversation.id,
        partner=ChatParticipantOut.model_validate(partner),
        last_message=None,
        updated_at=conversation.updated_at,
    )


@router.get("/{conversation_id}/messages", response_model=List[ChatMessageOut])
def list_messages(
    conversation_id: int,
    limit: int = Query(default=100, ge=1, le=200),
    after_id: Optional[int] = Query(default=None, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_conversation(conversation_id, current_user, db)
    query = (
        db.query(ChatMessage)
        .options(joinedload(ChatMessage.sender))
        .filter(ChatMessage.conversation_id == conversation_id)
    )
    if after_id is not None:
        return (
            query.filter(ChatMessage.id > after_id)
            .order_by(ChatMessage.id.asc())
            .limit(limit)
            .all()
        )
    messages = (
        query.order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(messages))


@router.post(
    "/{conversation_id}/messages",
    response_model=ChatMessageOut,
    status_code=status.HTTP_201_CREATED,
)
def send_message(
    conversation_id: int,
    data: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = _get_conversation(conversation_id, current_user, db)
    content = data.content.strip()
    image_url = data.image_url
    if image_url:
        match = IMAGE_DATA_URL.fullmatch(image_url)
        if not match:
            raise HTTPException(status_code=422, detail="Поддерживаются JPEG, PNG, WebP и GIF")
        try:
            image_data = base64.b64decode(match.group(1), validate=True)
        except (binascii.Error, ValueError):
            raise HTTPException(status_code=422, detail="Некорректное изображение")
        if len(image_data) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="Размер изображения не должен превышать 5 МБ")
        if not image_data:
            raise HTTPException(status_code=422, detail="Изображение пустое")
        image_type = image_url.partition(":")[2].partition(";")[0]
        valid_image = {
            "image/jpeg": image_data.startswith(b"\xff\xd8\xff"),
            "image/png": image_data.startswith(b"\x89PNG\r\n\x1a\n"),
            "image/gif": image_data.startswith((b"GIF87a", b"GIF89a")),
            "image/webp": image_data.startswith(b"RIFF") and image_data[8:12] == b"WEBP",
        }.get(image_type, False)
        if not valid_image:
            raise HTTPException(status_code=422, detail="Файл не является изображением указанного типа")
    if not content and not image_url:
        raise HTTPException(status_code=422, detail="Добавьте текст или изображение")

    message = ChatMessage(
        conversation_id=conversation.id,
        sender_id=current_user.id,
        content=content,
        image_url=image_url,
    )
    conversation.updated_at = datetime.utcnow()
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
