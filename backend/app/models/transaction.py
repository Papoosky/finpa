import datetime
from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional


class TransactionType(str, Enum):
    income = "income"
    expense = "expense"


class TransactionCreate(BaseModel):
    type: TransactionType = Field(..., description="Tipo de transacción: income o expense")
    amount: float = Field(..., description="Valor monetario de la transacción")
    date: datetime.date = Field(..., description="Fecha de la transacción")
    category: str = Field(..., description="Categoría (ej. Comida, Transporte, Cuentas)")
    description: Optional[str] = Field(default=None, description="Nota adicional de la transacción")


class TransactionResponse(BaseModel):
    id: str
    type: TransactionType
    amount: float
    date: datetime.date
    category: str
    status: str
