"""M3 — face_embeddings model/version/quality fields.

model_version uses a clearly documented placeholder because InsightFace is
not installed in the CI/dev environment. Never invent a model version.
Reversible.

Revision ID: 005_embedding_metadata
Revises: 004_participant_provenance
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005_embedding_metadata"
down_revision: Union[str, None] = "004_participant_provenance"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Clearly non-committal placeholder: InsightFace is not installed here.
MODEL_VERSION_PLACEHOLDER = "unknown-not-installed"


def upgrade() -> None:
    op.add_column(
        "face_embeddings",
        sa.Column("model_name", sa.String(64), nullable=False, server_default="insightface"),
    )
    op.add_column(
        "face_embeddings",
        sa.Column("model_version", sa.String(64), nullable=False, server_default=MODEL_VERSION_PLACEHOLDER),
    )
    op.add_column(
        "face_embeddings",
        sa.Column("dimension", sa.Integer, nullable=False, server_default="512"),
    )
    op.add_column("face_embeddings", sa.Column("quality_score", sa.Float, nullable=True))
    op.add_column(
        "face_embeddings",
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
    )
    op.add_column("face_embeddings", sa.Column("source_photo_hash", sa.String(64), nullable=True))

    conn = op.get_bind()
    conn.execute(
        sa.text(
            "UPDATE face_embeddings SET model_name = 'insightface', "
            "model_version = :mv, dimension = 512, is_active = true "
            "WHERE model_version IS NULL"
        ),
        {"mv": MODEL_VERSION_PLACEHOLDER},
    )


def downgrade() -> None:
    for column in ("source_photo_hash", "is_active", "quality_score", "dimension", "model_version", "model_name"):
        op.drop_column("face_embeddings", column)
