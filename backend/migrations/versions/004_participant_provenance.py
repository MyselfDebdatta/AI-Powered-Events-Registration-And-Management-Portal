"""M2 — participant provenance/status/consent fields and session extensions.

Existing synthetic rows become source=ADMIN with status IMPORTED (no embedding)
or SYNCED (an existing face embedding). No invented submission ids, consent or
photo keys are created. Reversible.

Revision ID: 004_participant_provenance
Revises: 003_events_event_ids
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004_participant_provenance"
down_revision: Union[str, None] = "003_events_event_ids"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SOURCE = sa.Enum("SITE_FORM", "WALK_IN", "ADMIN", name="participant_source", native_enum=False)
STATUS = sa.Enum(
    "IMPORTED", "PHOTO_VALIDATED", "EMBEDDING_READY", "SYNCED", "ARRIVED",
    "QR_ISSUED", "CHECKED_IN", "PHOTO_REJECTED", "DUPLICATE", "CANCELLED",
    "NO_SHOW", "BLOCKED",
    name="participant_status",
    native_enum=False,
)


def upgrade() -> None:
    op.add_column("participants", sa.Column("source", SOURCE, nullable=True))
    op.add_column("participants", sa.Column("submission_id", sa.String(36), nullable=True))
    op.add_column("participants", sa.Column("consent_version", sa.String(32), nullable=True))
    op.add_column("participants", sa.Column("consented_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("participants", sa.Column("photo_s3_key", sa.String(512), nullable=True))
    op.add_column("participants", sa.Column("photo_hash", sa.String(64), nullable=True))
    op.add_column("participants", sa.Column("photo_quality_score", sa.Float, nullable=True))
    op.add_column("participants", sa.Column("status", STATUS, nullable=True))
    op.add_column(
        "participants",
        sa.Column("embedding_status", sa.String(32), nullable=False, server_default="PENDING"),
    )
    # import_job_id references registration_jobs, created in M4; the FK is
    # added in M8 after that table exists.
    op.add_column("participants", sa.Column("import_job_id", sa.Integer, nullable=True))

    op.add_column("sessions", sa.Column("external_id", sa.String(128), nullable=True))
    op.add_column("sessions", sa.Column("capacity", sa.Integer, nullable=True))
    op.add_column(
        "sessions",
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
    )

    conn = op.get_bind()
    conn.execute(sa.text("UPDATE participants SET source = 'ADMIN' WHERE source IS NULL"))
    conn.execute(
        sa.text(
            "UPDATE participants SET status = "
            "CASE WHEN EXISTS (SELECT 1 FROM face_embeddings fe WHERE fe.participant_id = participants.id) "
            "THEN 'SYNCED' ELSE 'IMPORTED' END "
            "WHERE status IS NULL"
        )
    )


def downgrade() -> None:
    op.drop_column("sessions", "is_active")
    op.drop_column("sessions", "capacity")
    op.drop_column("sessions", "external_id")
    for column in (
        "import_job_id", "embedding_status", "status", "photo_quality_score",
        "photo_hash", "photo_s3_key", "consented_at", "consent_version",
        "submission_id", "source",
    ):
        op.drop_column("participants", column)
