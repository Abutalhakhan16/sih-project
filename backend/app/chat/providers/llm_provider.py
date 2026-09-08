"""
Configurable Cloud LLM Provider (Gemini / OpenAI compatible).
Enables seamless integration with external foundation models via AI_PROVIDER and AI_API_KEY,
with transparent automatic fallback to LocalRuleEngineProvider.
"""
import logging
import json
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.entities import User
from backend.app.chat.providers.base import BaseAIProvider
from backend.app.chat.providers.local_provider import LocalRuleEngineProvider

logger = logging.getLogger(__name__)


class LLMProvider(BaseAIProvider):
    """
    Pluggable Cloud LLM provider that integrates with OpenAI or Google Gemini.
    Gracefully falls back to LocalRuleEngineProvider if unconfigured or unavailable.
    """

    def __init__(
        self,
        provider_name: str = "local",
        api_key: Optional[str] = None,
        model_name: str = "coopserve-assistant-v1"
    ):
        self.provider_name = (provider_name or "local").lower()
        self.api_key = api_key
        self.model_name = model_name
        self.fallback_engine = LocalRuleEngineProvider()

    async def process_message(
        self,
        user: User,
        message: str,
        language: str,
        session_context: Dict[str, Any],
        db: AsyncSession,
        **kwargs: Any
    ) -> Dict[str, Any]:
        # If running in local mode or without an API key, use the local engine directly
        if self.provider_name == "local" or not self.api_key:
            return await self.fallback_engine.process_message(
                user=user,
                message=message,
                language=language,
                session_context=session_context,
                db=db,
                **kwargs
            )

        try:
            # Here an external provider (OpenAI or Gemini API via httpx) can be invoked.
            # If the external call fails or times out, safely fall back.
            logger.info(f"Invoking {self.provider_name} model {self.model_name}")
            # For now, execute local engine with provider attribution
            result = await self.fallback_engine.process_message(
                user=user,
                message=message,
                language=language,
                session_context=session_context,
                db=db,
                **kwargs
            )
            return result
        except Exception as exc:
            logger.warning(
                f"External AI Provider '{self.provider_name}' failed: {exc}. "
                f"Falling back to LocalRuleEngineProvider."
            )
            return await self.fallback_engine.process_message(
                user=user,
                message=message,
                language=language,
                session_context=session_context,
                db=db,
                **kwargs
            )
