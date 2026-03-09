"""Change amount column from Float to Numeric(12, 2)

Revision ID: 004
Revises: 003
Create Date: 2026-03-09

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "transactions",
        "amount",
        existing_type=sa.Float(),
        type_=sa.Numeric(12, 2),
        existing_nullable=False,
        postgresql_using="amount::numeric(12,2)",
    )


def downgrade() -> None:
    op.alter_column(
        "transactions",
        "amount",
        existing_type=sa.Numeric(12, 2),
        type_=sa.Float(),
        existing_nullable=False,
    )
