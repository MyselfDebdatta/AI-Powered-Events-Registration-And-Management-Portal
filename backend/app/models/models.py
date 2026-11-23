"""SQLAlchemy ORM models for GeekAI."""

from __future__ import annotations

import enum
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, relationship

from app.models.enums import ParticipantSource, ParticipantStatus


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    VOLUNTEER = "VOLUNTEER"


class ParticipantCategory(str, enum.Enum):
    STUDENT = "STUDENT"
    RESEARCHER = "RESEARCHER"
    PROFESSIONAL = "PROFESSIONAL"
    SPEAKER = "SPEAKER"
    OTHER = "OTHER"


class AttendanceMethod(str, enum.Enum):
    FACE = "FACE"
    QR = "QR"
    MANUAL = "MANUAL"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(320), unique=True, nullable=False, index=True)
    password_hash = Column(String(128), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole, name="user_role"), nullable=False, default=UserRole.VOLUNTEER)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    password_changed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships — attendance has two FKs to users (marked_by, verified_by);
    # the explicit foreign_keys keeps the original back-population unambiguous.
    attendances_marked = relationship(
        "Attendance",
        back_populates="marked_by_user",
        foreign_keys="Attendance.marked_by",
    )


class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    # Uniqueness is (event_id, lower(email)) after M8, not email alone.
    email = Column(String(320), nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    institution = Column(String(255), nullable=True)
    category = Column(
        Enum(ParticipantCategory, name="participant_category"),
        nullable=False,
        default=ParticipantCategory.OTHER,
    )
    photo_url = Column(String(512), nullable=True)
    qr_code_url = Column(String(512), nullable=True)
    registered_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    # Stage S2 provenance / state fields (M1 + M2).
    event_id = Column(Integer, ForeignKey("events.id", ondelete="RESTRICT"), nullable=False)
    source = Column(
        Enum(ParticipantSource, name="participant_source", native_enum=False),
        nullable=False,
        default=ParticipantSource.ADMIN,
    )
    submission_id = Column(String(36), nullable=True)
    consent_version = Column(String(32), nullable=True)
    consented_at = Column(DateTime(timezone=True), nullable=True)
    photo_s3_key = Column(String(512), nullable=True)
    photo_hash = Column(String(64), nullable=True)
    photo_quality_score = Column(Float, nullable=True)
    status = Column(
        Enum(ParticipantStatus, name="participant_status", native_enum=False),
        nullable=False,
        default=ParticipantStatus.IMPORTED,
    )
    embedding_status = Column(String(32), nullable=False, default="PENDING")
    import_job_id = Column(Integer, ForeignKey("registration_jobs.id", ondelete="RESTRICT"), nullable=True)

    # Relationships
    face_embeddings = relationship("FaceEmbedding", back_populates="participant", cascade="all, delete-orphan")
    attendances = relationship("Attendance", back_populates="participant", cascade="all, delete-orphan")


class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"), nullable=False, index=True)
    embedding = Column(Vector(512), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    # Stage S2 embedding metadata (M3). model_version is a clearly documented
    # placeholder when InsightFace is not installed — never an invented version.
    model_name = Column(String(64), nullable=False, default="insightface")
    model_version = Column(String(64), nullable=False, default="unknown-not-installed")
    dimension = Column(Integer, nullable=False, default=512)
    quality_score = Column(Float, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    source_photo_hash = Column(String(64), nullable=True)

    # Relationships
    participant = relationship("Participant", back_populates="face_embeddings")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    location = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    # Stage S2 (M1 + M2)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="RESTRICT"), nullable=False)
    external_id = Column(String(128), nullable=True)
    capacity = Column(Integer, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    # Relationships
    attendances = relationship("Attendance", back_populates="session", cascade="all, delete-orphan")


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint("participant_id", "session_id", name="uq_participant_session"),
        Index(
            "unique_event_attendance",
            "participant_id",
            unique=True,
            postgresql_where="session_id IS NULL",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=True, index=True)
    method = Column(Enum(AttendanceMethod, name="attendance_method"), nullable=False)
    marked_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    marked_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    # Stage S2 (M1 + M6). client_event_id stays nullable for legacy rows and is
    # protected by a partial UNIQUE index in M8.
    event_id = Column(Integer, ForeignKey("events.id", ondelete="RESTRICT"), nullable=False)
    client_event_id = Column(String(64), nullable=True)
    client_marked_at = Column(DateTime(timezone=True), nullable=True)
    station_id = Column(String(64), nullable=True)
    verified_by = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    note = Column(Text, nullable=True)
    is_void = Column(Boolean, nullable=False, default=False)
    void_reason = Column(String(255), nullable=True)
    voided_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    participant = relationship("Participant", back_populates="attendances")
    session = relationship("Session", back_populates="attendances")
    marked_by_user = relationship(
        "User",
        back_populates="attendances_marked",
        foreign_keys="Attendance.marked_by",
    )
