"""Sessions API — CRUD for symposium sessions.

Stage S1 protects the previously anonymous list/detail reads with staff
principal and event scope. Writes were already admin-only and gain scope.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_admin, get_current_staff, get_db, require_event_scope
from app.models.models import Attendance, Session, User
from app.schemas.schemas import SessionCreate, SessionDetail, SessionOut, SessionUpdate
from app.services.audit import audit_log
from app.services.events import get_active_event_id

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

_staff_event = require_event_scope(settings.ACTIVE_EVENT_CODE)
_admin_event = require_event_scope(settings.ACTIVE_EVENT_CODE)


async def _audit(
    db: AsyncSession,
    request: Request,
    action: str,
    actor: User,
    entity_id: str | None = None,
    after: dict | None = None,
) -> None:
    await audit_log(
        db,
        action=action,
        actor_id=actor.id,
        actor_role=actor.role.value if hasattr(actor.role, "value") else actor.role,
        entity="session",
        entity_id=entity_id,
        after=after,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        request_id=getattr(request.state, "request_id", None),
    )


@router.post("/", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: SessionCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    session = Session(**body.model_dump(), event_id=await get_active_event_id(db))
    db.add(session)
    await db.flush()
    await db.refresh(session)
    await _audit(db, request, "SESSION_CREATED", _admin, str(session.id), {"name": session.name})
    return session


@router.get("/", response_model=list[SessionOut])
async def list_sessions(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _staff: User = Depends(_staff_event),
):
    result = await db.execute(select(Session).order_by(Session.start_time))
    sessions = result.scalars().all()
    await _audit(db, request, "SESSION_LIST_READ", _staff, after={"count": len(sessions)})
    return sessions


@router.get("/{session_id}", response_model=SessionDetail)
async def get_session(
    session_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _staff: User = Depends(_staff_event),
):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    count_result = await db.execute(
        select(func.count()).select_from(Attendance).where(Attendance.session_id == session_id)
    )
    count = count_result.scalar()

    await _audit(db, request, "SESSION_READ", _staff, str(session_id), {"attendance_count": count})
    return SessionDetail(
        id=session.id,
        name=session.name,
        description=session.description,
        start_time=session.start_time,
        end_time=session.end_time,
        location=session.location,
        created_at=session.created_at,
        attendance_count=count,
    )


@router.put("/{session_id}", response_model=SessionOut)
async def update_session(
    session_id: int,
    body: SessionUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(session, key, value)

    await db.flush()
    await db.refresh(session)
    await _audit(db, request, "SESSION_UPDATED", _admin, str(session_id), update_data)
    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    await _audit(db, request, "SESSION_DELETED", _admin, str(session_id), {"name": session.name})
    await db.delete(session)
    await db.flush()
