"""M7 — email_outbox and sync_batches.

No data migration. Reversible.

Revision ID: 009_outbox_sync_batches
Revises: 008_attendance_offline
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "009_outbox_sync_batches"
down_revision: Union[str, None] = "008_attendance_offline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "email_outbox",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "participant_id",
            sa.Integer,
            sa.ForeignKey("participants.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("template", sa.String(64), nullable=False),
        sa.Column("payload_json", sa.Text, nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="PENDING"),
        sa.Column("attempts", sa.Integer, nullable=False, server_default="0"),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("provider_message_id", sa.String(128), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text, nullable=True),
    )
    op.create_index("ix_email_outbox_status_next_attempt", "email_outbox", ["status", "next_attempt_at"])
    op.create_index("ix_email_outbox_participant_id", "email_outbox", ["participant_id"])

    op.create_table(
        "sync_batches",
        sa.Column("batch_id", sa.String(128), primary_key=True),
        sa.Column("hub_id", sa.String(64), nullable=False),
        sa.Column("cursor_from", sa.Integer, nullable=False),
        sa.Column("cursor_to", sa.Integer, nullable=False),
        sa.Column("item_count", sa.Integer, nullable=False),
        sa.Column("accepted_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("rejected_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("checksum", sa.String(64), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_sync_batches_received_at", "sync_batches", ["received_at"])


def downgrade() -> None:
    op.drop_index("ix_sync_batches_received_at", table_name="sync_batches")
    op.drop_table("sync_batches")
    op.drop_index("ix_email_outbox_participant_id", table_name="email_outbox")
    op.drop_index("ix_email_outbox_status_next_attempt", table_name="email_outbox")
    op.drop_table("email_outbox")
