import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field


class TransactionType(StrEnum):
    income = "income"
    expense = "expense"


class TransactionCreate(BaseModel):
    type: TransactionType
    amount: float = Field(..., gt=0)
    date: datetime.date
    category: str = Field(max_length=100)
    description: str | None = Field(default=None, max_length=500)


class TransactionUpdate(BaseModel):
    type: TransactionType | None = None
    amount: float | None = Field(default=None, gt=0)
    date: datetime.date | None = None
    category: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=500)


class TransactionResponse(BaseModel):
    uuid: UUID
    type: TransactionType
    amount: float
    date: datetime.date
    category: str
    description: str | None

    model_config = {"from_attributes": True}


class PaginatedTransactions(BaseModel):
    items: list[TransactionResponse]
    total: int
    limit: int
    offset: int
