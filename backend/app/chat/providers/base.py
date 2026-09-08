from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.entities import User

class BaseAIProvider(ABC):
    """Abstract interface for Co-opServe AI assistant providers."""

    @abstractmethod
    async def process_message(
        self,
        user: User,
        message: str,
        language: str,
        session_context: Dict[str, Any],
        db: AsyncSession,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """
        Processes a user message and executes any required database tools.
        Returns a dict containing:
          - reply: str
          - intent: str
          - language: str
          - action: Optional[Dict[str, Any]]
          - suggested_actions: List[str]
          - updated_context: Dict[str, Any]
        """
        pass
