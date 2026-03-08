import os
import time
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User

SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Simple in-memory user cache: {user_uuid: (User, timestamp)}
_user_cache: dict[UUID, tuple[User, float]] = {}
_USER_CACHE_TTL = 300  # 5 minutes


def _invalidate_user_cache(user_uuid: UUID) -> None:
    _user_cache.pop(user_uuid, None)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_uuid: UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_uuid), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_uuid_str: str | None = payload.get("sub")
        if user_uuid_str is None:
            raise credentials_exception
        user_uuid = UUID(user_uuid_str)
    except (JWTError, ValueError):
        raise credentials_exception

    # Check cache first
    cached = _user_cache.get(user_uuid)
    if cached is not None:
        user, ts = cached
        if time.monotonic() - ts < _USER_CACHE_TTL:
            # Merge cached user into current session so lazy loads work
            user = await db.merge(user)
            return user
        else:
            del _user_cache[user_uuid]

    result = await db.execute(select(User).where(User.uuid == user_uuid))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception

    _user_cache[user_uuid] = (user, time.monotonic())
    return user
