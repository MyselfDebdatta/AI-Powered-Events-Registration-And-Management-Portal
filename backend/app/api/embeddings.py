"""Embeddings API — unauthenticated biometric export removed in S1.

`GET /api/embeddings/sync` returned all 512-d embeddings with participant
names and photo URLs to anyone. Stage S1 disables it with 410 in favour of
the future admin/hub-scoped `/api/sync/bundle` (stage S8). The old response
shape is intentionally not served — there is no compatible "safe" version.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_admin, get_db
from app.models.models import User
from app.services.audit import audit_log

router = APIRouter(prefix="/api/embeddings", tags=["embeddings"])


@router.get("/sync")
async def sync_embeddings(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Return 410 — unauthenticated biometric export is gone.

    Authorised admins reach this route but receive a documented 410 until
    `/api/sync/bundle` lands in stage S8. Anonymous/volunteer callers fail
    earlier with 401/403 from `get_current_admin`.
    """
    await audit_log(
        db,
        action="EMBEDDING_SYNC_READ_REJECTED",
        actor_id=_admin.id,
        actor_role=_admin.role.value if hasattr(_admin.role, "value") else _admin.role,
        entity="embedding",
        after={"result": "410", "code": "BIOMETRIC_EXPORT_DISABLED"},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        request_id=getattr(request.state, "request_id", None),
    )
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail={
            "code": "BIOMETRIC_EXPORT_DISABLED",
            "message": "Unauthenticated biometric export is disabled. Use /api/sync/bundle (stage S8).",
        },
    )
