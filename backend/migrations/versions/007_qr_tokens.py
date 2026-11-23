"""M5 — qr_tokens (signed QR state).

Legacy unsigned QR PNGs are deliberately NOT migrated: they contain a
forgeable {"participant_id", "name"} payload and must be reissued in S5.
FKs use ON DELETE RESTRICT. Reversible.

Revision ID: 007_qr_tokens
Revises: 006_registration_jobs
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "007_qr_tokens"
down_revision: Union[str, None] = "006_registration_jobs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "qr_tokens",
        sa.Column("jti", sa.String(36), primary_key=True),
        sa.Column(
            "participant_id",
            sa.Integer,
            sa.ForeignKey("participants.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("event_id", sa.Integer, sa.ForeignKey("events.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("scope", sa.String(16), nullable=False, server_default="ENTRY"),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("issued_by", sa.Integer, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("station_id", sa.String(64), nullable=True),
        sa.Column("similarity", sa.Float, nullable=True),
        sa.Column("signature_alg", sa.String(32), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_qr_tokens_participant_event_scope", "qr_tokens", ["participant_id", "event_id", "scope"])


def downgrade() -> None:
    op.drop_index("ix_qr_tokens_participant_event_scope", table_name="qr_tokens")
    op.drop_table("qr_tokens")
