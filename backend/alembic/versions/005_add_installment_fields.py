"""Add installment fields to transactions

Revision ID: 005
Revises: 004
Create Date: 2026-03-19

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "transactions", sa.Column("installment_total", sa.Integer(), nullable=True)
    )
    op.add_column(
        "transactions", sa.Column("installment_number", sa.Integer(), nullable=True)
    )
    op.add_column(
        "transactions", sa.Column("installment_group", sa.Uuid(), nullable=True)
    )
    op.create_index(
        "ix_transactions_installment_group",
        "transactions",
        ["installment_group"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_transactions_installment_group", table_name="transactions")
    op.drop_column("transactions", "installment_group")
    op.drop_column("transactions", "installment_number")
    op.drop_column("transactions", "installment_total")
