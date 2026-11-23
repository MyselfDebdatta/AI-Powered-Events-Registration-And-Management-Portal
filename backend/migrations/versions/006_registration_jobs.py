"""M4 — registration_jobs (audit_log already delivered in S1 revision 002).

No data migration. Reversible.

Revision ID: 006_registration_jobs
Revises: 005_embedding_metadata
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "006_registration_jobs"
down_revision: Union[str, None] = "005_embedding_metadata"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "registration_jobs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("source", sa.String(32), nullable=False),
        sa.Column("submission_id", sa.String(36), nullable=True),
        sa.Column("rows_total", sa.Integer, nullable=False, server_default="0"),
        sa.Column("rows_accepted", sa.Integer, nullable=False, server_default="0"),
        sa.Column("rows_rejected", sa.Integer, nullable=False, server_default="0"),
        sa.Column("report_s3_key", sa.String(512), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actor_id", sa.Integer, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("registration_jobs")
