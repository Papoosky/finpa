import datetime
from pydantic import BaseModel, Field
from typing import Optional

class TransactionCreate(BaseModel):
    amount: float = Field(..., description="Valor monetario del gasto")
    date: datetime.date = Field(..., description="Fecha de la transacción")
    category: str = Field(..., description="Categoría (ej. Comida, Transporte, Cuentas)")
    description: Optional[str] = Field(default=None, description="Nota adicional de la transacción")

class TransactionResponse(BaseModel):
    id: str
    amount: float
    date: datetime.date
    category: str
    status: str
