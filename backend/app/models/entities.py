"""New ORM models introduced by stage S2 (Database-Planning.md M1, M4-M7).

`audit_log` was delivered in S1 revision 002 and lives in app/models/audit.py;
this module intentionally does not redefine it.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.models.enums import QRScope
from app.models.models import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(64), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    # Unconfirmed event facts stay NULL/TBA — do not invent dates or venue.
    starts_at = Column(DateTime(timezone=True), nullable=True)
    ends_at = Column(DateTime(timezone=True), nullable=True)
    timezone = Column(String(64), nullable=True)
    venue = Column(String(255), nullable=True)
    status = Column(String(32), nullable=False, default="PLANNED")


class RegistrationJob(Base):
    __tablename__ = "registration_jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(String(32), nullable=False)
    submission_id = Column(String(36), nullable=True)
    rows_total = Column(Integer, nullable=False, default=0)
    rows_accepted = Column(Integer, nullable=False, default=0)
    rows_rejected = Column(Integer, nullable=False, default=0)
    report_s3_key = Column(String(512), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    finished_at = Column(DateTime(timezone=True), nullable=True)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)


class QRToken(Base):
    __tablename__ = "qr_tokens"

    jti = Column(String(36), primary_key=True)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="RESTRICT"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="RESTRICT"), nullable=False)
    scope = Column(String(16), nullable=False, default=QRScope.ENTRY.value)
    issued_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    issued_by = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    station_id = Column(String(64), nullable=True)
    similarity = Column(Float, nullable=True)
    signature_alg = Column(String(32), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    used_at = Column(DateTime(timezone=True), nullable=True)


class EmailOutbox(Base):
    __tablename__ = "email_outbox"

    id = Column(Integer, primary_key=True, autoincrement=True)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="RESTRICT"), nullable=False)
    template = Column(String(64), nullable=False)
    payload_json = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="PENDING")
    attempts = Column(Integer, nullable=False, default=0)
    next_attempt_at = Column(DateTime(timezone=True), nullable=True)
    provider_message_id = Column(String(128), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)


class SyncBatch(Base):
    __tablename__ = "sync_batches"

    batch_id = Column(String(128), primary_key=True)
    hub_id = Column(String(64), nullable=False)
    cursor_from = Column(Integer, nullable=False)
    cursor_to = Column(Integer, nullable=False)
    item_count = Column(Integer, nullable=False)
    accepted_count = Column(Integer, nullable=False, default=0)
    rejected_count = Column(Integer, nullable=False, default=0)
    checksum = Column(String(64), nullable=True)
    received_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


__all__ = ["Event", "RegistrationJob", "QRToken", "EmailOutbox", "SyncBatch"]
