from __future__ import annotations

import datetime  # noqa: TC003 - needed at runtime by SQLAlchemy Mapped[]
import uuid as _uuid
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Index, Integer, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transactions_user_date", "user_id", "date"),
        Index("ix_transactions_user_type", "user_id", "type"),
        Index("ix_transactions_user_category", "user_id", "category"),
        Index("ix_transactions_installment_group", "installment_group"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uuid: Mapped[_uuid.UUID] = mapped_column(
        Uuid, unique=True, index=True, default=_uuid.uuid4
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(10))
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    date: Mapped[datetime.date] = mapped_column(Date, index=True)
    category: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    installment_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    installment_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    installment_group: Mapped[_uuid.UUID | None] = mapped_column(Uuid, nullable=True)

    user: Mapped[User] = relationship(back_populates="transactions")
