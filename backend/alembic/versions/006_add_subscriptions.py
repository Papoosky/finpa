"""Add subscriptions table and subscription_uuid to transactions

Revision ID: 006
Revises: 005
Create Date: 2026-03-29

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("uuid", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("service_key", sa.String(50), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="CLP"),
        sa.Column("interval", sa.String(10), nullable=False),
        sa.Column("billing_day", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("last_charged_date", sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("uuid"),
    )
    op.create_index("ix_subscriptions_uuid", "subscriptions", ["uuid"], unique=True)
    op.create_index(
        "ix_subscriptions_user_id", "subscriptions", ["user_id"], unique=False
    )

    op.add_column(
        "transactions", sa.Column("subscription_uuid", sa.Uuid(), nullable=True)
    )
    op.create_index(
        "ix_transactions_subscription_uuid",
        "transactions",
        ["subscription_uuid"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_transactions_subscription_uuid", table_name="transactions")
    op.drop_column("transactions", "subscription_uuid")

    op.drop_index("ix_subscriptions_user_id", table_name="subscriptions")
    op.drop_index("ix_subscriptions_uuid", table_name="subscriptions")
    op.drop_table("subscriptions")
