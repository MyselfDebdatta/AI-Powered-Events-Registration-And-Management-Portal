"""M8 — post-backfill constraints and indexes.

Makes event_id non-null, adds the composite uniques from Database-Planning.md
§3, enforces one active ENTRY token per participant/event, adds the live-ops
indexes and the pgvector HNSW index. Existing uq_participant_session and the
partial event-level attendance index from 001_initial are preserved.
Reversible.

Revision ID: 010_constraints_indexes
Revises: 009_outbox_sync_batches
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "010_constraints_indexes"
down_revision: Union[str, None] = "009_outbox_sync_batches"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # All rows were backfilled in M1/M2, so these are safe to make required.
    for table in ("participants", "sessions", "attendance"):
        op.alter_column(table, "event_id", existing_type=sa.Integer, nullable=False)
    for column in ("source", "status"):
        op.alter_column("participants", column, existing_type=sa.String(32), nullable=False)

    op.execute(
        "CREATE UNIQUE INDEX uq_participant_event_email ON participants (event_id, lower(email))"
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_participant_event_submission ON participants (event_id, submission_id) "
        "WHERE submission_id IS NOT NULL"
    )
    op.create_index("ix_participants_event_status", "participants", ["event_id", "status"])
    op.create_index("ix_face_embeddings_participant_active", "face_embeddings", ["participant_id", "is_active"])
    # pgvector HNSW; vector_cosine_ops is available in pgvector/pgvector:pg16.
    op.execute(
        "CREATE INDEX ix_face_embeddings_embedding_hnsw ON face_embeddings "
        "USING hnsw (embedding vector_cosine_ops)"
    )

    op.execute(
        "CREATE UNIQUE INDEX uq_qr_active_entry ON qr_tokens (participant_id, event_id) "
        "WHERE scope = 'ENTRY' AND revoked_at IS NULL AND used_at IS NULL"
    )
    # Kept partial (not a plain UNIQUE) because S1 attendance writes may omit
    # client_event_id; this preserves that behaviour while enforcing it when set.
    op.execute(
        "CREATE UNIQUE INDEX uq_attendance_client_event ON attendance (client_event_id) "
        "WHERE client_event_id IS NOT NULL"
    )
    op.create_index("ix_attendance_event_marked_at", "attendance", ["event_id", "marked_at"])

    op.create_foreign_key(
        "fk_participants_import_job",
        "participants",
        "registration_jobs",
        ["import_job_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint("fk_participants_import_job", "participants", type_="foreignkey")
    op.drop_index("ix_attendance_event_marked_at", table_name="attendance")
    op.execute("DROP INDEX IF EXISTS uq_attendance_client_event")
    op.execute("DROP INDEX IF EXISTS uq_qr_active_entry")
    op.execute("DROP INDEX IF EXISTS ix_face_embeddings_embedding_hnsw")
    op.drop_index("ix_face_embeddings_participant_active", table_name="face_embeddings")
    op.drop_index("ix_participants_event_status", table_name="participants")
    op.execute("DROP INDEX IF EXISTS uq_participant_event_submission")
    op.execute("DROP INDEX IF EXISTS uq_participant_event_email")

    for column in ("status", "source"):
        op.alter_column("participants", column, existing_type=sa.String(32), nullable=True)
    for table in ("attendance", "sessions", "participants"):
        op.alter_column(table, "event_id", existing_type=sa.Integer, nullable=True)
