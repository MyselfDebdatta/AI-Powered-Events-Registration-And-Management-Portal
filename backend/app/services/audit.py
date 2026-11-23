"""Audit helper — writes structured, redacted audit log rows.

Call this from route handlers (and middleware where appropriate) to record
actor, role, action, entity, before/after, IP, user agent and request_id.
Never log raw biometric data, photos, tokens or unredacted PII.
"""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog

# Fields that must never appear in audit log JSON.
_REDACT_FIELDS = {
    "email",
    "phone",
    "password",
    "password_hash",
    "token",
    "access_token",
    "refresh_token",
    "photo_key",
    "photo_s3_key",
    "photo_url",
    "qr_code_url",
    "embedding",
    "embeddings",
    "secret",
    "bootstrap_token",
    "qr_signing_key",
}


def _redact(obj: Any) -> Any:
    """Recursively redact sensitive fields from a JSON-serialisable object."""
    if isinstance(obj, dict):
        return {
            k: ("[REDACTED]" if k in _REDACT_FIELDS else _redact(v))
            for k, v in obj.items()
        }
    if isinstance(obj, list):
        return [_redact(v) for v in obj]
    return obj


async def audit_log(
    session: AsyncSession,
    *,
    action: str,
    actor_id: int | None = None,
    actor_role: str | None = None,
    entity: str | None = None,
    entity_id: str | None = None,
    before: dict | None = None,
    after: dict | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
    request_id: str | None = None,
) -> None:
    """Insert an audit row with redacted before/after payloads."""
    row = AuditLog(
        actor_id=actor_id,
        actor_role=actor_role,
        action=action,
        entity=entity,
        entity_id=entity_id,
        before_json=json.dumps(_redact(before)) if before is not None else None,
        after_json=json.dumps(_redact(after)) if after is not None else None,
        ip=ip,
        user_agent=user_agent,
        request_id=request_id,
    )
    session.add(row)
    # Flush so the row is visible within the same transaction; the caller
    # controls commit/rollback.
    await session.flush()


async def audit_log_detached(**kwargs) -> None:
    """Persist an audit row in its own short-lived transaction.

    Failure paths (for example a rejected login) write an audit row and then
    raise an HTTPException. Because `get_db` rolls the request session back on
    any exception, a row written through that session is lost. This variant
    opens a separate session so failure-path rows survive the rollback.

    The same redaction helper and field set are used — no raw email, password,
    token or bootstrap secret is ever stored.
    """
    # Lazy import avoids a module-level cycle with app.core.deps.
    from app.core.deps import async_session_factory

    async with async_session_factory() as session:
        await audit_log(session, **kwargs)
        await session.commit()
