"""Participants API — authenticated CRUD, photo/QR uploads, search/filter.

Stage S1 protects every route that returns participant PII. The legacy
`/qrcode` route returns 410 (signed passes arrive in S5). Response shapes
are unchanged for the delivered frontend.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.deps import get_current_staff, get_db, require_event_scope
from app.models.models import (
    Attendance,
    FaceEmbedding,
    Participant,
    ParticipantCategory,
    User,
)
from app.schemas.schemas import AttendanceOut, ParticipantDetail, ParticipantList, ParticipantOut
from app.services.audit import audit_log
from app.services.email_service import send_qr_email
from app.services.events import get_active_event_id
from app.services.embedding_service import generate_embedding
from app.services.qr_service import generate_qr_code

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/participants", tags=["participants"])

_staff_event = require_event_scope(settings.ACTIVE_EVENT_CODE)


async def _audit(
    db: AsyncSession,
    request: Request,
    action: str,
    actor: User,
    *,
    entity: str = "participant",
    entity_id: str | None = None,
    before: dict | None = None,
    after: dict | None = None,
) -> None:
    await audit_log(
        db,
        action=action,
        actor_id=actor.id,
        actor_role=actor.role.value if hasattr(actor.role, "value") else actor.role,
        entity=entity,
        entity_id=entity_id,
        before=before,
        after=after,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        request_id=getattr(request.state, "request_id", None),
    )


@router.post("/", response_model=ParticipantOut, status_code=status.HTTP_201_CREATED)
async def register_participant(
    background_tasks: BackgroundTasks,
    request: Request,
    name: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(None),
    institution: Optional[str] = Form(None),
    category: ParticipantCategory = Form(ParticipantCategory.OTHER),
    photo: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    _staff: User = Depends(_staff_event),
):
    """Register a new participant (staff walk-in). Same response as before."""
    existing = await db.execute(select(Participant).where(Participant.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Participant with this email already exists")

    participant = Participant(
        name=name,
        email=email,
        phone=phone,
        institution=institution,
        category=category,
        event_id=await get_active_event_id(db),
    )
    db.add(participant)
    await db.flush()
    await db.refresh(participant)

    photo_path: Optional[str] = None
    if photo and photo.filename:
        photo_dir = settings.photos_dir
        filename = f"{participant.id}.jpg"
        filepath = photo_dir / filename
        with open(filepath, "wb") as f:
            f.write(await photo.read())
        participant.photo_url = f"uploads/photos/{filename}"
        photo_path = str(filepath)

    # Legacy QR PNG generation is retained for now but the /qrcode read route
    # is disabled (410) and /uploads is no longer public. S5 replaces this.
    qr_rel = generate_qr_code(participant.id, participant.name)
    participant.qr_code_url = qr_rel

    await db.flush()
    await db.refresh(participant)

    if photo_path:
        embedding_vec = generate_embedding(photo_path)
        face_emb = FaceEmbedding(
            participant_id=participant.id,
            embedding=embedding_vec,
        )
        db.add(face_emb)
        await db.flush()

    qr_abs_path = str(settings.qrcodes_dir / f"{participant.id}.png")
    background_tasks.add_task(send_qr_email, participant.email, participant.name, qr_abs_path)

    await _audit(
        db,
        request,
        "PARTICIPANT_CREATED",
        _staff,
        entity_id=str(participant.id),
        after={"name": participant.name, "category": participant.category.value},
    )
    return participant


@router.get("/", response_model=ParticipantList)
async def list_participants(
    request: Request,
    search: Optional[str] = None,
    category: Optional[ParticipantCategory] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _staff: User = Depends(_staff_event),
):
    query = select(Participant)
    count_query = select(func.count()).select_from(Participant)

    if search:
        pattern = f"%{search}%"
        filter_clause = or_(
            Participant.name.ilike(pattern),
            Participant.email.ilike(pattern),
        )
        query = query.where(filter_clause)
        count_query = count_query.where(filter_clause)

    if category:
        query = query.where(Participant.category == category)
        count_query = count_query.where(Participant.category == category)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(Participant.registered_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()

    await _audit(
        db,
        request,
        "PARTICIPANT_LIST_READ",
        _staff,
        after={"count": len(items), "search": bool(search), "category": category.value if category else None},
    )
    return ParticipantList(total=total, items=[ParticipantOut.model_validate(p) for p in items])


@router.get("/{participant_id}", response_model=ParticipantDetail)
async def get_participant(
    participant_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _staff: User = Depends(_staff_event),
):
    result = await db.execute(
        select(Participant)
        .where(Participant.id == participant_id)
        .options(selectinload(Participant.attendances))
    )
    participant = result.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participant not found")

    attendances = []
    for a in participant.attendances:
        attendances.append(
            AttendanceOut(
                id=a.id,
                participant_id=a.participant_id,
                session_id=a.session_id,
                method=a.method,
                marked_by=a.marked_by,
                marked_at=a.marked_at,
            )
        )

    await _audit(
        db,
        request,
        "PARTICIPANT_READ",
        _staff,
        entity_id=str(participant_id),
        after={"result": "found"},
    )
    return ParticipantDetail(
        id=participant.id,
        name=participant.name,
        email=participant.email,
        phone=participant.phone,
        institution=participant.institution,
        category=participant.category,
        photo_url=participant.photo_url,
        qr_code_url=participant.qr_code_url,
        registered_at=participant.registered_at,
        attendances=attendances,
    )


@router.get("/{participant_id}/photo")
async def get_participant_photo(
    participant_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _staff: User = Depends(_staff_event),
):
    """Serve the participant photo through an authenticated handler.

    The public `/uploads` static mount has been removed; direct file access
    is no longer possible. Every read is audited.
    """
    result = await db.execute(select(Participant).where(Participant.id == participant_id))
    participant = result.scalar_one_or_none()
    if not participant or not participant.photo_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    filepath = Path(participant.photo_url)
    if not filepath.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo file missing")

    await _audit(
        db,
        request,
        "PARTICIPANT_PHOTO_READ",
        _staff,
        entity_id=str(participant_id),
        after={"result": "served"},
    )
    return FileResponse(filepath, media_type="image/jpeg")


@router.get("/{participant_id}/qrcode")
async def get_participant_qrcode(
    participant_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _staff: User = Depends(_staff_event),
):
    """Legacy unsigned QR PNGs are no longer served.

    Returns 410 `LEGACY_QR_DISABLED`. Signed passes arrive with S5 via
    `POST /api/qr/issue`. The scanner never falls back to this route.
    """
    await _audit(
        db,
        request,
        "LEGACY_QR_READ_REJECTED",
        _staff,
        entity_id=str(participant_id),
        after={"result": "410", "code": "LEGACY_QR_DISABLED"},
    )
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail={
            "code": "LEGACY_QR_DISABLED",
            "message": "Legacy unsigned QR codes are disabled. Use /api/qr/issue (stage S5).",
        },
    )
