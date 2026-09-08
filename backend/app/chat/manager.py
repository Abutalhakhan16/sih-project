"""
Conversation and session manager for Co-opServe AI Assistant.
Maintains session state, persists messages to PostgreSQL/SQLite,
enforces role isolation, and coordinates with configured AI providers.
"""
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.config import settings
from backend.app.models.entities import User, ChatSession, ChatMessage
from backend.app.schemas.all_schemas import (
    ChatMessageRequest,
    ChatMessageOut,
    ChatActionPayload,
    ChatHistoryOut
)
from backend.app.chat.providers.base import BaseAIProvider
from backend.app.chat.providers.local_provider import LocalRuleEngineProvider
from backend.app.chat.providers.llm_provider import LLMProvider

logger = logging.getLogger(__name__)

# Provider factory based on settings
def get_ai_provider() -> BaseAIProvider:
    if settings.AI_PROVIDER == "local" or not settings.AI_API_KEY:
        return LocalRuleEngineProvider()
    return LLMProvider(
        provider_name=settings.AI_PROVIDER,
        api_key=settings.AI_API_KEY,
        model_name=settings.AI_MODEL
    )

_provider = get_ai_provider()


async def get_or_create_session(db: AsyncSession, user: User) -> ChatSession:
    """Gets the latest active chat session for a user or creates a new one."""
    stmt = (
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.user_id == user.id)
        .order_by(ChatSession.updated_at.desc())
    )
    res = await db.execute(stmt)
    session = res.scalars().first()

    if not session:
        session = ChatSession(
            user_id=user.id,
            role=user.role,
            context_data=json.dumps({})
        )
        db.add(session)
        await db.flush()
        # reload with messages relationship
        session = (await db.execute(
            select(ChatSession).options(selectinload(ChatSession.messages)).where(ChatSession.id == session.id)
        )).scalar_one()

    return session


async def handle_user_message(
    db: AsyncSession,
    user: User,
    payload: ChatMessageRequest
) -> ChatMessageOut:
    """Processes an incoming user message, updates session state, and returns response."""
    session = await get_or_create_session(db, user)

    # Decode session context
    context: Dict[str, Any] = {}
    if session.context_data:
        try:
            context = json.loads(session.context_data)
        except Exception:
            context = {}

    # Merge any incoming request context overrides (e.g. location, address, service)
    if payload.latitude is not None and payload.longitude is not None:
        context["latitude"] = payload.latitude
        context["longitude"] = payload.longitude
    if payload.address:
        context["address"] = payload.address
    if payload.service:
        context["selected_service"] = payload.service
    if payload.context:
        context.update(payload.context)

    # 1. Persist User Message
    user_msg = ChatMessage(
        session_id=session.id,
        sender="user",
        message=payload.message.strip(),
        timestamp=datetime.utcnow()
    )
    db.add(user_msg)
    await db.flush()

    # 2. Process via AI Provider
    ai_response = await _provider.process_message(
        user=user,
        message=payload.message,
        language=payload.language or user.language or "en",
        session_context=context,
        db=db,
        latitude=payload.latitude,
        longitude=payload.longitude,
        address=payload.address
    )

    reply_text = ai_response.get("reply", "")
    intent = ai_response.get("intent", "GENERAL")
    detected_lang = ai_response.get("language", payload.language or "en")
    action_dict = ai_response.get("action")
    suggested_actions = ai_response.get("suggested_actions", [])
    updated_context = ai_response.get("updated_context", context)

    # 3. Update Session Context
    session.context_data = json.dumps(updated_context)
    session.updated_at = datetime.utcnow()

    # 4. Persist Assistant Message
    meta_json = json.dumps({
        "intent": intent,
        "language": detected_lang,
        "action": action_dict,
        "suggested_actions": suggested_actions
    }) if (action_dict or suggested_actions) else None

    assistant_msg = ChatMessage(
        session_id=session.id,
        sender="assistant",
        message=reply_text,
        metadata_json=meta_json,
        timestamp=datetime.utcnow()
    )
    db.add(assistant_msg)
    await db.commit()

    # 5. Build output model
    action_payload = None
    if action_dict:
        action_payload = ChatActionPayload(
            action_type=action_dict.get("action_type", ""),
            data=action_dict.get("data", {})
        )

    return ChatMessageOut(
        id=assistant_msg.id,
        sender="assistant",
        message=reply_text,
        timestamp=assistant_msg.timestamp,
        intent=intent,
        language=detected_lang,
        action=action_payload,
        suggested_actions=suggested_actions
    )


async def get_session_history(db: AsyncSession, user: User) -> ChatHistoryOut:
    """Returns the message history for the active session."""
    session = await get_or_create_session(db, user)
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.timestamp.asc())
    )
    res = await db.execute(stmt)
    db_messages = res.scalars().all()

    messages_out: List[ChatMessageOut] = []
    for m in db_messages:
        action_payload = None
        suggested = []
        intent = None
        lang = user.language or "en"

        if m.metadata_json:
            try:
                meta = json.loads(m.metadata_json)
                intent = meta.get("intent")
                lang = meta.get("language", lang)
                suggested = meta.get("suggested_actions", [])
                if meta.get("action"):
                    action_payload = ChatActionPayload(
                        action_type=meta["action"].get("action_type", ""),
                        data=meta["action"].get("data", {})
                    )
            except Exception:
                pass

        messages_out.append(ChatMessageOut(
            id=m.id,
            sender=m.sender,
            message=m.message,
            timestamp=m.timestamp,
            intent=intent,
            language=lang,
            action=action_payload,
            suggested_actions=suggested
        ))

    return ChatHistoryOut(
        session_id=session.id,
        messages=messages_out
    )


async def clear_session_history(db: AsyncSession, user: User) -> None:
    """Clears all messages and resets context for the user's active session."""
    session = await get_or_create_session(db, user)
    await db.execute(delete(ChatMessage).where(ChatMessage.session_id == session.id))
    session.context_data = json.dumps({})
    session.updated_at = datetime.utcnow()
    await db.commit()
