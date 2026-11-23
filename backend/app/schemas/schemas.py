"""Pydantic request/response schemas for GeekAI API."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.models import AttendanceMethod, ParticipantCategory, UserRole


# ===== Auth =================================================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    name: str
    # True when the principal must change their password before further work.
    # Additive field — the delivered frontend ignores unknown response keys.
    must_change_password: bool = False
    event_ids: List[str] = []


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)
    role: UserRole = UserRole.VOLUNTEER


class BootstrapRequest(BaseModel):
    """One-time first-admin bootstrap request.

    `token` is the bootstrap secret from the environment (BOOTSTRAP_TOKEN).
    Only accepted while the users table is empty.
    """
    token: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1)


class BootstrapResponse(BaseModel):
    """Bootstrap result: the first admin user plus their login token."""
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    must_change_password: bool = True


class ChangePasswordRequest(BaseModel):
    """First-login password change for the bootstrap admin."""
    current_password: str
    new_password: str = Field(min_length=8)


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class VolunteerOut(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    attendance_count: int = 0

    class Config:
        from_attributes = True


class VolunteerCreate(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)


# ===== Participants =========================================================

class ParticipantCreate(BaseModel):
    """Fields submitted as form data (photo comes as UploadFile)."""
    name: str = Field(min_length=1)
    email: EmailStr
    phone: Optional[str] = None
    institution: Optional[str] = None
    category: ParticipantCategory = ParticipantCategory.OTHER


class ParticipantOut(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    institution: Optional[str] = None
    category: ParticipantCategory
    photo_url: Optional[str] = None
    qr_code_url: Optional[str] = None
    registered_at: datetime

    class Config:
        from_attributes = True


class ParticipantDetail(ParticipantOut):
    attendances: List[AttendanceOut] = []

    class Config:
        from_attributes = True


class ParticipantList(BaseModel):
    total: int
    items: List[ParticipantOut]


# ===== Sessions =============================================================

class SessionCreate(BaseModel):
    name: str = Field(min_length=1)
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    location: Optional[str] = None


class SessionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None


class SessionOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    location: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SessionDetail(SessionOut):
    attendance_count: int = 0


# ===== Attendance ===========================================================

class AttendanceCreate(BaseModel):
    participant_id: int
    session_id: Optional[int] = None
    method: AttendanceMethod = AttendanceMethod.MANUAL


class AttendanceOut(BaseModel):
    id: int
    participant_id: int
    session_id: Optional[int] = None
    method: AttendanceMethod
    marked_by: int
    marked_at: datetime
    participant_name: Optional[str] = None
    session_name: Optional[str] = None

    class Config:
        from_attributes = True


class AttendanceStats(BaseModel):
    total_participants: int
    total_checked_in: int
    total_sessions: int
    attendance_by_method: dict
    attendance_by_session: List[dict]


class QRValidateRequest(BaseModel):
    participant_id: int
    name: str


class QRValidateResponse(BaseModel):
    valid: bool
    participant: Optional[ParticipantOut] = None
    message: str


class FaceMatchResponse(BaseModel):
    matched: bool
    participant: Optional[ParticipantOut] = None
    similarity: float = 0.0
    already_checked_in: bool = False
    message: str


# ===== Embeddings ===========================================================

class EmbeddingOut(BaseModel):
    participant_id: int
    name: str
    embedding: List[float]
    photo_url: Optional[str] = None


# ===== Admin / Dashboard ====================================================

class DashboardStats(BaseModel):
    total_participants: int
    total_sessions: int
    total_attendance_records: int
    event_checkins: int
    participants_by_category: dict
    recent_registrations: List[ParticipantOut]


# ---------------------------------------------------------------------------
# Resolve forward references
# ---------------------------------------------------------------------------
ParticipantDetail.model_rebuild()
BootstrapResponse.model_rebuild()
