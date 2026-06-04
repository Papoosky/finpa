from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_service_token
from app.database import get_db
from app.models.user import User
from app.schemas.users import UserByTelegramResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "/by-telegram/{telegram_id}",
    response_model=UserByTelegramResponse,
    dependencies=[Depends(require_service_token)],
)
async def get_user_by_telegram(
    telegram_id: str,
    db: AsyncSession = Depends(get_db),
) -> UserByTelegramResponse:
    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return UserByTelegramResponse(uuid=user.uuid, name=user.name)
