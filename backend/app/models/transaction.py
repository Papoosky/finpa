import uuid as _uuid
import datetime
from sqlalchemy import Integer, String, Float, Date, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uuid: Mapped[_uuid.UUID] = mapped_column(Uuid, unique=True, index=True, default=_uuid.uuid4)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(10))
    amount: Mapped[float] = mapped_column(Float)
    date: Mapped[datetime.date] = mapped_column(Date)
    category: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    user: Mapped["User"] = relationship(back_populates="transactions")
