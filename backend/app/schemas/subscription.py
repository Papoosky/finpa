import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field


class SubscriptionInterval(StrEnum):
    monthly = "monthly"
    yearly = "yearly"


class SubscriptionCurrency(StrEnum):
    CLP = "CLP"
    USD = "USD"


class SubscriptionCreate(BaseModel):
    name: str = Field(max_length=100)
    service_key: str | None = Field(default=None, max_length=50)
    amount: float = Field(..., gt=0)
    currency: SubscriptionCurrency = SubscriptionCurrency.CLP
    interval: SubscriptionInterval
    billing_day: int = Field(..., ge=1, le=31)
    start_date: datetime.date
    description: str | None = Field(default=None, max_length=500)


class SubscriptionUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    service_key: str | None = Field(default=None, max_length=50)
    amount: float | None = Field(default=None, gt=0)
    currency: SubscriptionCurrency | None = None
    interval: SubscriptionInterval | None = None
    billing_day: int | None = Field(default=None, ge=1, le=31)
    start_date: datetime.date | None = None
    description: str | None = Field(default=None, max_length=500)


class SubscriptionResponse(BaseModel):
    uuid: UUID
    name: str
    service_key: str | None
    amount: float
    currency: str
    interval: str
    billing_day: int
    start_date: datetime.date
    is_active: bool
    description: str | None
    last_charged_date: datetime.date | None

    model_config = {"from_attributes": True}
