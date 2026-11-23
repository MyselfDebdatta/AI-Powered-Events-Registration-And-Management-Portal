"""M6 — attendance offline/idempotency and void fields.

client_event_id is nullable for legacy rows and backfilled deterministically
from the existing primary key. marked_at is never rewritten. Reversible.

Revision ID: 008_attendance_offline
Revises: 007_qr_tokens
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "008_attendance_offline"
down_revision: Union[str, None] = "007_qr_tokens"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("attendance", sa.Column("client_event_id", sa.String(64), nullable=True))
    op.add_column("attendance", sa.Column("client_marked_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("attendance", sa.Column("station_id", sa.String(64), nullable=True))
    op.add_column(
        "attendance",
        sa.Column("verified_by", sa.Integer, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
    )
    op.add_column("attendance", sa.Column("note", sa.Text, nullable=True))
    op.add_column(
        "attendance",
        sa.Column("is_void", sa.Boolean, nullable=False, server_default=sa.text("false")),
    )
    op.add_column("attendance", sa.Column("void_reason", sa.String(255), nullable=True))
    op.add_column("attendance", sa.Column("voided_at", sa.DateTime(timezone=True), nullable=True))

    # Deterministic, valid UUID-shaped backfill; marked_at is untouched.
    # Prefix is 8 zero hex digits so the literal has the 8-4-4-4-12 shape.
    op.execute(
        "UPDATE attendance SET client_event_id = "
        "('00000000-0000-0000-0000-' || lpad(id::text, 12, '0'))::uuid::text "
        "WHERE client_event_id IS NULL"
    )


def downgrade() -> None:
    for column in (
        "voided_at", "void_reason", "is_void", "note", "verified_by",
        "station_id", "client_marked_at", "client_event_id",
    ):
        op.drop_column("attendance", column)
