import hashlib
import os
import secrets
import time
from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import PyJWTError
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.refresh_token import RefreshToken
from app.models.user import User

SECRET_KEY = os.environ["SECRET_KEY"]
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

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
    expire = datetime.now(UTC) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_uuid), "exp": expire, "iat": datetime.now(UTC)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


async def create_refresh_token(user_id: int, db: AsyncSession) -> str:
    raw_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.now(UTC) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    refresh = RefreshToken(
        token_hash=token_hash,
        user_id=user_id,
        expires_at=expires_at,
    )
    db.add(refresh)
    await db.commit()
    return raw_token


async def verify_refresh_token(raw_token: str, db: AsyncSession) -> RefreshToken:
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked.is_(False),
        )
    )
    refresh = result.scalar_one_or_none()
    if not refresh or refresh.expires_at < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalido o expirado",
        )
    return refresh


async def revoke_refresh_token(raw_token: str, db: AsyncSession) -> None:
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    refresh = result.scalar_one_or_none()
    if refresh:
        refresh.revoked = True
        await db.commit()


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
    except (PyJWTError, ValueError) as err:
        raise credentials_exception from err

    # Check cache first
    cached = _user_cache.get(user_uuid)
    if cached is not None:
        user, ts = cached
        if time.monotonic() - ts < _USER_CACHE_TTL:
            # Merge cached user into current session so lazy loads work
            return await db.merge(user)
        del _user_cache[user_uuid]

    result = await db.execute(select(User).where(User.uuid == user_uuid))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception

    _user_cache[user_uuid] = (user, time.monotonic())
    return user
