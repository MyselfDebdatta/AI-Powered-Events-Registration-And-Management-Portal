"""JWT token creation/verification and password hashing utilities.

Stage S1 extends the JWT claims with `role`, `event_ids`, optional
`station_id`/`hub_id` and `password_changed_at` tracking exactly as
`Backend-Planning.md` §4.2 defines. The `sub` claim is the user id (kept for
backward compatibility with the delivered frontend's `AuthContext`).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


# ---------------------------------------------------------------------------
# Password helpers — use bcrypt directly (passlib has Python 3.14 issues)
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and verify a JWT. Raises JWTError on failure."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def token_claims(
    *,
    sub: int | str,
    role: str,
    event_ids: Optional[List[str]] = None,
    station_id: Optional[str] = None,
    hub_id: Optional[str] = None,
    password_changed_at: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Build a standardised JWT claim set.

    `sub` is the user id. `event_ids` is the list of event scopes the
    principal is authorised for. `station_id`/`hub_id` mark hub/station
    principals. `password_changed_at` marks when the password was last
    rotated (null means a forced change is pending).
    """
    claims: Dict[str, Any] = {
        "sub": str(sub),
        "role": role,
    }
    if event_ids is not None:
        claims["event_ids"] = event_ids
    if station_id is not None:
        claims["station_id"] = station_id
    if hub_id is not None:
        claims["hub_id"] = hub_id
    if password_changed_at is not None:
        claims["password_changed_at"] = password_changed_at
    if extra:
        claims.update(extra)
    return claims
