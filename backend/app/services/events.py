"""Active-event lookup shared by the write endpoints introduced/affected by S2."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.entities import Event


async def get_active_event_id(db: AsyncSession) -> int:
    """Return the integer id of the configured active event.

    Migrations always create this row, so a missing row is a configuration
    error rather than a signal to create a placeholder event.
    """
    result = await db.execute(select(Event.id).where(Event.code == settings.ACTIVE_EVENT_CODE))
    event_id = result.scalar_one_or_none()
    if event_id is None:
        raise RuntimeError(
            f"Active event '{settings.ACTIVE_EVENT_CODE}' is missing; run Alembic migrations to head"
        )
    return event_id
