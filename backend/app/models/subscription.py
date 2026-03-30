from __future__ import annotations

import datetime  # noqa: TC003 - needed at runtime by SQLAlchemy Mapped[]
import uuid as _uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, ForeignKey, Integer, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uuid: Mapped[_uuid.UUID] = mapped_column(
        Uuid, unique=True, index=True, default=_uuid.uuid4
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    service_key: Mapped[str | None] = mapped_column(String(50), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(3), default="CLP")  # "CLP" | "USD"
    interval: Mapped[str] = mapped_column(String(10))  # "monthly" | "yearly"
    billing_day: Mapped[int] = mapped_column(Integer)  # 1-31
    start_date: Mapped[datetime.date] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    last_charged_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)

    user: Mapped[User] = relationship(back_populates="subscriptions")
