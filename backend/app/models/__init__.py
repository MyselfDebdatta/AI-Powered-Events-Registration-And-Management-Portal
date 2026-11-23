"""SQLAlchemy models and enums package."""

from app.models.audit import AuditLog
from app.models.entities import EmailOutbox, Event, QRToken, RegistrationJob, SyncBatch
from app.models.enums import ParticipantSource, ParticipantStatus, QRScope
from app.models.models import (
    Attendance,
    AttendanceMethod,
    Base,
    FaceEmbedding,
    Participant,
    ParticipantCategory,
    Session,
    User,
    UserRole,
)

__all__ = [
    "Base",
    "UserRole",
    "ParticipantCategory",
    "AttendanceMethod",
    "ParticipantSource",
    "ParticipantStatus",
    "QRScope",
    "AuditLog",
    "Event",
    "RegistrationJob",
    "QRToken",
    "EmailOutbox",
    "SyncBatch",
    "User",
    "Participant",
    "FaceEmbedding",
    "Session",
    "Attendance",
]
