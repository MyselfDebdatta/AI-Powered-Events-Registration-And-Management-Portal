"""Attendance API — record, query, validate QR (disabled), face match.

Stage S1 protects every read with a staff principal and event scope, and
disables the legacy unsigned `validate-qr` path with 410. Response shapes
are unchanged.
"""

from __future__ import annotations

import os
import tempfile
from typing import Optional

import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.deps import get_current_staff, get_db, require_event_scope
from app.models.models import (
    Attendance,
    AttendanceMethod,
    FaceEmbedding,
    Participant,
    Session,
    User,
)
from app.schemas.schemas import (
    AttendanceCreate,
    AttendanceOut,
    AttendanceStats,
    FaceMatchResponse,
    ParticipantOut,
    QRValidateRequest,
    QRValidateResponse,
)
from app.services.audit import audit_log
from app.services.embedding_service import generate_embedding
from app.services.events import get_active_event_id

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

_staff_event = require_event_scope(settings.ACTIVE_EVENT_CODE)


async def _audit(
    db: AsyncSession,
    request: Request,
    action: str,
    actor: User,
    entity: str = "attendance",
    entity_id: str | None = None,
    after: dict | None = None,
) -> None:
    await audit_log(
        db,
        action=action,
        actor_id=actor.id,
        actor_role=actor.role.value if hasattr(actor.role, "value") else actor.role,
        entity=entity,
        entity_id=entity_id,
        after=after,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        request_id=getattr(request.state, "request_id", None),
    )


@router.post("/", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
async def record_attendance(
    body: AttendanceCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_staff_event),
):
    """Record attendance for a participant. Prevents duplicates."""
    p_result = await db.execute(select(Participant).where(Participant.id == body.participant_id))
    participant = p_result.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participant not found")

    if body.session_id is not None:
        s_result = await db.execute(select(Session).where(Session.id == body.session_id))
        if not s_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if body.session_id is not None:
        dup_query = select(Attendance).where(
            and_(
                Attendance.participant_id == body.participant_id,
                Attendance.session_id == body.session_id,
            )
        )
    else:
        dup_query = select(Attendance).where(
            and_(
                Attendance.participant_id == body.participant_id,
                Attendance.session_id.is_(None),
            )
        )

    dup_result = await db.execute(dup_query)
    if dup_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance already recorded for this participant" + (
                f" in session {body.session_id}" if body.session_id else " at event level"
            ),
        )

    attendance = Attendance(
        participant_id=body.participant_id,
        session_id=body.session_id,
        method=body.method,
        marked_by=current_user.id,
        event_id=await get_active_event_id(db),
    )
    db.add(attendance)
    await db.flush()
    await db.refresh(attendance)

    await _audit(
        db,
        request,
        "ATTENDANCE_RECORDED",
        current_user,
        entity_id=str(attendance.id),
        after={
            "participant_id": body.participant_id,
            "session_id": body.session_id,
            "method": body.method.value,
        },
    )
    return AttendanceOut(
        id=attendance.id,
        participant_id=attendance.participant_id,
        session_id=attendance.session_id,
        method=attendance.method,
        marked_by=attendance.marked_by,
        marked_at=attendance.marked_at,
        participant_name=participant.name,
    )


@router.get("/event", response_model=list[AttendanceOut])
async def event_attendance(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _staff: User = Depends(_staff_event),
):
    """List all event-level attendance (session_id IS NULL)."""
    result = await db.execute(
        select(Attendance, Participant.name)
        .join(Participant, Attendance.participant_id == Participant.id)
        .where(Attendance.session_id.is_(None))
        .order_by(Attendance.marked_at.desc())
    )
    rows = result.all()
    await _audit(db, request, "ATTENDANCE_LIST_READ", _staff, after={"scope": "event", "count": len(rows)})
    return [
        AttendanceOut(
            id=a.id,
            participant_id=a.participant_id,
            session_id=a.session_id,
            method=a.method,
            marked_by=a.marked_by,
            marked_at=a.marked_at,
            participant_name=name,
        )
        for a, name in rows
    ]


@router.get("/session/{session_id}", response_model=list[AttendanceOut])
async def session_attendance(
    session_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _staff: User = Depends(_staff_event),
):
    """List all attendance records for a specific session."""
    s_result = await db.execute(select(Session).where(Session.id == session_id))
    if not s_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    result = await db.execute(
        select(Attendance, Participant.name, Session.name)
        .join(Participant, Attendance.participant_id == Participant.id)
        .outerjoin(Session, Attendance.session_id == Session.id)
        .where(Attendance.session_id == session_id)
        .order_by(Attendance.marked_at.desc())
    )
    rows = result.all()
    await _audit(
        db,
        request,
        "ATTENDANCE_SESSION_READ",
        _staff,
        entity_id=str(session_id),
        after={"count": len(rows)},
    )
    return [
        AttendanceOut(
            id=a.id,
            participant_id=a.participant_id,
            session_id=a.session_id,
            method=a.method,
            marked_by=a.marked_by,
            marked_at=a.marked_at,
            participant_name=p_name,
            session_name=s_name,
        )
        for a, p_name, s_name in rows
    ]


@router.get("/stats", response_model=AttendanceStats)
async def attendance_stats(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _staff: User = Depends(_staff_event),
):
    """Overall attendance statistics."""
    total_p = (await db.execute(select(func.count()).select_from(Participant))).scalar()
    total_checked = (
        await db.execute(
            select(func.count(func.distinct(Attendance.participant_id))).select_from(Attendance)
        )
    ).scalar()
    total_sessions = (await db.execute(select(func.count()).select_from(Session))).scalar()

    method_result = await db.execute(
        select(Attendance.method, func.count())
        .group_by(Attendance.method)
    )
    by_method = {row[0].value: row[1] for row in method_result.all()}

    session_result = await db.execute(
        select(Session.id, Session.name, func.count(Attendance.id))
        .outerjoin(Attendance, Attendance.session_id == Session.id)
        .group_by(Session.id, Session.name)
        .order_by(Session.start_time)
    )
    by_session = [
        {"session_id": sid, "session_name": sname, "count": cnt}
        for sid, sname, cnt in session_result.all()
    ]

    await _audit(db, request, "ATTENDANCE_STATS_READ", _staff, after={"scope": "aggregate"})
    return AttendanceStats(
        total_participants=total_p,
        total_checked_in=total_checked,
        total_sessions=total_sessions,
        attendance_by_method=by_method,
        attendance_by_session=by_session,
    )


@router.post("/validate-qr", response_model=QRValidateResponse)
async def validate_qr(
    body: QRValidateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _staff: User = Depends(_staff_event),
):
    """Legacy unsigned QR validation is disabled in S1.

    Returns 410 `LEGACY_QR_DISABLED` and writes an audit row. The delivered
    scanner already refuses this path; there is no fallback.
    """
    await _audit(
        db,
        request,
        "LEGACY_QR_REJECTED",
        _staff,
        entity="qr",
        after={"result": "410", "code": "LEGACY_QR_DISABLED"},
    )
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail={
            "code": "LEGACY_QR_DISABLED",
            "message": "Legacy unsigned QR validation is disabled. Use /api/qr/verify (stage S5).",
        },
    )


@router.post("/face-match", response_model=FaceMatchResponse)
async def match_face(
    request: Request,
    photo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_staff_event),
):
    """Identify a participant from an uploaded face snapshot."""
    # Save uploaded photo to a temporary file
    suffix = os.path.splitext(photo.filename or "")[1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        content = await photo.read()
        tmp.write(content)

    try:
        query_vec = generate_embedding(tmp_path)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    query_arr = np.array(query_vec, dtype=np.float32)
    query_norm = np.linalg.norm(query_arr)
    if query_norm == 0 or np.all(query_arr == 0):
        return FaceMatchResponse(
            matched=False,
            message="No face detected in the photo. Please ensure face is centered and clearly lit.",
        )

    query_unit = query_arr / query_norm

    result = await db.execute(
        select(FaceEmbedding).options(selectinload(FaceEmbedding.participant))
    )
    embeddings = result.scalars().all()

    if not embeddings:
        return FaceMatchResponse(
            matched=False,
            message="No participant face embeddings available in the database.",
        )

    best_match: Optional[FaceEmbedding] = None
    best_sim = -1.0

    for emb in embeddings:
        if not emb.embedding or not emb.participant:
            continue
        vec = np.array(emb.embedding, dtype=np.float32)
        v_norm = np.linalg.norm(vec)
        if v_norm == 0:
            continue
        sim = float(np.dot(vec / v_norm, query_unit))
        if sim > best_sim:
            best_sim = sim
            best_match = emb

    MATCH_THRESHOLD = 0.40  # Consistent with face-checkin configuration
    if best_match is None or best_sim < MATCH_THRESHOLD:
        return FaceMatchResponse(
            matched=False,
            similarity=round(max(0.0, best_sim), 4),
            message="No registered participant matched above the similarity threshold.",
        )

    participant = best_match.participant

    att_res = await db.execute(
        select(Attendance).where(
            and_(
                Attendance.participant_id == participant.id,
                Attendance.session_id.is_(None),
            )
        )
    )
    existing_att = att_res.scalar_one_or_none()

    await _audit(
        db,
        request,
        "FACE_MATCH_ATTEMPTED",
        current_user,
        entity="participant",
        entity_id=str(participant.id),
        after={"matched": True, "similarity": round(best_sim, 4)},
    )
    return FaceMatchResponse(
        matched=True,
        participant=ParticipantOut.model_validate(participant),
        similarity=round(best_sim, 4),
        already_checked_in=existing_att is not None,
        message=f"Participant identified: {participant.name}",
    )
