import datetime
from enum import Enum
from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional


class TransactionType(str, Enum):
    income = "income"
    expense = "expense"


class TransactionCreate(BaseModel):
    type: TransactionType
    amount: float = Field(..., gt=0)
    date: datetime.date
    category: str
    description: Optional[str] = None


class TransactionUpdate(BaseModel):
    type: Optional[TransactionType] = None
    amount: Optional[float] = Field(default=None, gt=0)
    date: Optional[datetime.date] = None
    category: Optional[str] = None
    description: Optional[str] = None


class TransactionResponse(BaseModel):
    uuid: UUID
    type: TransactionType
    amount: float
    date: datetime.date
    category: str
    description: Optional[str]

    model_config = {"from_attributes": True}


class PaginatedTransactions(BaseModel):
    items: list[TransactionResponse]
    total: int
    limit: int
    offset: int
