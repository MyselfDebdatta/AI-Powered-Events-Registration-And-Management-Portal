"""Auth API — login, register, bootstrap (replaces seed), password change."""

from __future__ import annotations

import hmac
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_admin, get_current_user, get_db
from app.core.rate_limit import enforce_bootstrap_limit, enforce_login_limits
from app.core.security import (
    create_access_token,
    hash_password,
    token_claims,
    verify_password,
)
from app.models.models import User, UserRole
from app.schemas.schemas import (
    BootstrapRequest,
    BootstrapResponse,
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)
from app.services.audit import audit_log, audit_log_detached

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _event_ids(user: User) -> list[str]:
    """Event scopes for a newly issued token (single active event in S1)."""
    return [settings.ACTIVE_EVENT_CODE]


def _audit_kwargs(
    request: Request,
    *,
    action: str,
    actor_id: int | None = None,
    actor_role: str | None = None,
    entity: str = "user",
    entity_id: str | None = None,
    before: dict | None = None,
    after: dict | None = None,
) -> dict:
    """Build the standard audit field set from the request context."""
    return {
        "action": action,
        "actor_id": actor_id,
        "actor_role": actor_role,
        "entity": entity,
        "entity_id": entity_id,
        "before": before,
        "after": after,
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "request_id": getattr(request.state, "request_id", None),
    }


async def _write_audit(db: AsyncSession, request: Request, **kwargs) -> None:
    """Success path: write through the request session (committed with it)."""
    await audit_log(db, **_audit_kwargs(request, **kwargs))


async def _write_failure_audit(request: Request, **kwargs) -> None:
    """Failure path: commit in a separate session before the request rolls back."""
    await audit_log_detached(**_audit_kwargs(request, **kwargs))


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    await enforce_login_limits(request, account=body.email)

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
    )
    if not user or not verify_password(body.password, user.password_hash):
        await _write_failure_audit(
            request,
            action="LOGIN_FAILED",
            actor_id=user.id if user else None,
            actor_role=user.role.value if user else None,
            entity_id=str(user.id) if user else None,
            after={"email": body.email, "result": "invalid_credentials"},
        )
        raise invalid
    if not user.is_active:
        await _write_failure_audit(
            request,
            action="LOGIN_FAILED",
            actor_id=user.id,
            actor_role=user.role.value,
            entity_id=str(user.id),
            after={"result": "account_deactivated"},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account deactivated",
        )

    claims = token_claims(
        sub=user.id,
        role=user.role.value,
        event_ids=_event_ids(user),
        password_changed_at=(
            user.password_changed_at.isoformat() if user.password_changed_at else None
        ),
    )
    token = create_access_token(claims)
    must_change = user.password_changed_at is None
    await _write_audit(
        db,
        request,
        action="LOGIN_SUCCEEDED",
        actor_id=user.id,
        actor_role=user.role.value,
        entity_id=str(user.id),
        after={"result": "success", "must_change_password": must_change},
    )
    return TokenResponse(
        access_token=token,
        role=user.role,
        name=user.name,
        must_change_password=must_change,
        event_ids=_event_ids(user),
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
        role=body.role,
        # Staff created by an admin already have a chosen password.
        password_changed_at=datetime.now(timezone.utc),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    await _write_audit(
        db,
        request,
        action="STAFF_CREATED",
        actor_id=_admin.id,
        actor_role=_admin.role.value,
        entity_id=str(user.id),
        after={"role": user.role.value},
    )
    return user


@router.post("/bootstrap", response_model=BootstrapResponse, status_code=status.HTTP_201_CREATED)
async def bootstrap(
    body: BootstrapRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Create the first admin. One-time, token-gated, zero-users-only.

    Uses a Postgres advisory transaction lock (`pg_advisory_xact_lock`) so two
    concurrent requests cannot both create an admin. The lock is held until
    the request's transaction commits, so the second request observes the
    first admin and fails with 409. The bootstrap token therefore works
    exactly once.
    """
    await enforce_bootstrap_limit(request)

    # Constant-time comparison against the environment secret.
    if not hmac.compare_digest(body.token, settings.BOOTSTRAP_TOKEN):
        await _write_failure_audit(
            request,
            action="BOOTSTRAP_FAILED",
            after={"reason": "invalid_token"},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid bootstrap token",
        )

    # Serialise first-boot writes inside a transaction-scoped advisory lock.
    await db.execute(select(func.pg_advisory_xact_lock(20261121)))

    count_result = await db.execute(select(func.count()).select_from(User))
    if count_result.scalar() > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Users already exist — bootstrap is not allowed",
        )

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
        role=UserRole.ADMIN,
        password_changed_at=None,  # forces a change on first login
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    claims = token_claims(
        sub=user.id,
        role=user.role.value,
        event_ids=_event_ids(user),
        password_changed_at=None,
    )
    token = create_access_token(claims)

    await _write_audit(
        db,
        request,
        action="BOOTSTRAP_ADMIN_CREATED",
        actor_id=user.id,
        actor_role=user.role.value,
        entity="user",
        entity_id=str(user.id),
        after={"role": UserRole.ADMIN.value, "first_admin": True},
    )

    return BootstrapResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
        must_change_password=True,
    )


@router.post("/change-password", response_model=UserOut)
async def change_password(
    body: ChangePasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rotate the caller's password and clear the forced-change flag."""
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    before = {"password_changed_at": (
        current_user.password_changed_at.isoformat() if current_user.password_changed_at else None
    )}
    current_user.password_hash = hash_password(body.new_password)
    current_user.password_changed_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(current_user)

    await _write_audit(
        db,
        request,
        action="PASSWORD_CHANGED",
        actor_id=current_user.id,
        actor_role=current_user.role.value,
        entity="user",
        entity_id=str(current_user.id),
        before=before,
        after={"password_changed_at": current_user.password_changed_at.isoformat()},
    )
    return current_user
