"""Security foundation — audit_log table and password_changed_at column.

Pulls `audit_log` forward from Database-Planning.md M4 into stage S1 (G1).
Adds `password_changed_at` to `users` so the bootstrap flow can force a
password change on first login. All changes are additive and reversible.

Revision ID: 002_security_foundation
Revises: 001_initial
Create Date: 2026-11-21 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "002_security_foundation"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- audit_log -----------------------------------------------------------
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("actor_id", sa.Integer, nullable=True, index=True),
        sa.Column("actor_role", sa.String(32), nullable=True),
        sa.Column("action", sa.String(64), nullable=False, index=True),
        sa.Column("entity", sa.String(64), nullable=True, index=True),
        sa.Column("entity_id", sa.String(64), nullable=True),
        sa.Column("before_json", sa.Text, nullable=True),
        sa.Column("after_json", sa.Text, nullable=True),
        sa.Column("ip", sa.String(64), nullable=True),
        sa.Column("user_agent", sa.String(255), nullable=True),
        sa.Column("request_id", sa.String(64), nullable=True, index=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_audit_log_entity_entity_id_created_at", "audit_log", ["entity", "entity_id", "created_at"])
    op.create_index("ix_audit_log_actor_id_created_at", "audit_log", ["actor_id", "created_at"])

    # -- users: password_changed_at ------------------------------------------
    op.add_column(
        "users",
        sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    # -- users: remove password_changed_at -----------------------------------
    op.drop_column("users", "password_changed_at")

    # -- audit_log -----------------------------------------------------------
    op.drop_index("ix_audit_log_actor_id_created_at", table_name="audit_log")
    op.drop_index("ix_audit_log_entity_entity_id_created_at", table_name="audit_log")
    op.drop_table("audit_log")
