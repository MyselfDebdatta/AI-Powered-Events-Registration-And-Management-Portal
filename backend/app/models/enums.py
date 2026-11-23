"""Schema enums introduced by stage S2.

Kept in a standalone module so both the ORM models and the Alembic revisions
can reference the same names without circular imports. Enum values come from
`Database-Planning.md` §2.2, `WorkFlow.md` §8.1 and Appendix B — no new values
are invented here.
"""

from __future__ import annotations

import enum


class ParticipantSource(str, enum.Enum):
    SITE_FORM = "SITE_FORM"
    WALK_IN = "WALK_IN"
    ADMIN = "ADMIN"


class ParticipantStatus(str, enum.Enum):
    IMPORTED = "IMPORTED"
    PHOTO_VALIDATED = "PHOTO_VALIDATED"
    EMBEDDING_READY = "EMBEDDING_READY"
    SYNCED = "SYNCED"
    ARRIVED = "ARRIVED"
    QR_ISSUED = "QR_ISSUED"
    CHECKED_IN = "CHECKED_IN"
    PHOTO_REJECTED = "PHOTO_REJECTED"
    DUPLICATE = "DUPLICATE"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"
    BLOCKED = "BLOCKED"


class QRScope(str, enum.Enum):
    ENTRY = "ENTRY"
    SESSION = "SESSION"
    GENERAL = "GENERAL"
