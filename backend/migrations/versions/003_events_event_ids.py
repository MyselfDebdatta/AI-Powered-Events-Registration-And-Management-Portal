"""M1 — events table and nullable event_id columns (stage S2).

Creates the single default event `oas-2026` with code/name only. Dates, venue
and timezone stay NULL because they are unconfirmed facts (D10 is PENDING).
Backfills every existing PII row with this event id. Reversible.

Revision ID: 003_events_event_ids
Revises: 002_security_foundation
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003_events_event_ids"
down_revision: Union[str, None] = "002_security_foundation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EVENT_CODE = "oas-2026"
EVENT_NAME = "Odisha AI Symposium 2026"


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("code", sa.String(64), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("timezone", sa.String(64), nullable=True),
        sa.Column("venue", sa.String(255), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="PLANNED"),
    )

    for table in ("participants", "sessions", "attendance"):
        op.add_column(
            table,
            sa.Column(
                "event_id",
                sa.Integer,
                sa.ForeignKey("events.id", ondelete="RESTRICT"),
                nullable=True,
            ),
        )

    conn = op.get_bind()
    conn.execute(
        sa.text(
            "INSERT INTO events (code, name, status) "
            "VALUES (:code, :name, 'PLANNED') "
            "ON CONFLICT (code) DO NOTHING"
        ),
        {"code": EVENT_CODE, "name": EVENT_NAME},
    )
    event_id = conn.execute(sa.text("SELECT id FROM events WHERE code = :code"), {"code": EVENT_CODE}).scalar_one()
    for table in ("participants", "sessions", "attendance"):
        conn.execute(sa.text(f"UPDATE {table} SET event_id = :eid WHERE event_id IS NULL"), {"eid": event_id})


def downgrade() -> None:
    for table in ("attendance", "sessions", "participants"):
        op.drop_column(table, "event_id")
    op.drop_table("events")
