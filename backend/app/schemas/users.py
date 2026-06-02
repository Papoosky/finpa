from uuid import UUID

from pydantic import BaseModel


class UserByTelegramResponse(BaseModel):
    uuid: UUID
    name: str
