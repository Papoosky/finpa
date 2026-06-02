import hashlib
import logging
import os
import secrets
import time
from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from fastapi import Depends, Header, HTTPException, status
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
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "10080")
)
REFRESH_TOKEN_EXPIRE_DAYS = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

HERMES_SERVICE_TOKEN = os.environ.get("HERMES_SERVICE_TOKEN", "")
ACT_AS_USER_HEADER = "X-Act-As-User"

_logger = logging.getLogger("finpa.security")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Simple in-memory user cache: {user_uuid: (User, timestamp)}
_user_cache: dict[UUID, tuple[User, float]] = {}
_USER_CACHE_TTL = 300  # 5 minutes


def _invalidate_user_cache(user_uuid: UUID) -> None:
    _user_cache.pop(user_uuid, None)


def _is_service_token(presented: str) -> bool:
    """Constant-time check whether the presented token is the Hermes service token."""
    if not HERMES_SERVICE_TOKEN:
        return False
    return secrets.compare_digest(presented, HERMES_SERVICE_TOKEN)


async def _resolve_acting_user(x_act_as_user: str | None, db: AsyncSession) -> User:
    """Resolve the X-Act-As-User header to a User row for service-token requests."""
    if x_act_as_user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Act-As-User header required for service-token requests",
        )
    try:
        act_as_uuid = UUID(x_act_as_user)
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UUID in X-Act-As-User",
        ) from err

    result = await db.execute(select(User).where(User.uuid == act_as_uuid))
    user = result.scalar_one_or_none()
    if user is None:
        _logger.warning(
            "service_token_request acting_user_uuid=%s not found", act_as_uuid
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Acting user not found",
        )

    _logger.info("service_token_request acting_user_uuid=%s", act_as_uuid)
    return user


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
    x_act_as_user: str | None = Header(default=None, alias=ACT_AS_USER_HEADER),
) -> User:
    # Service-token path: bypass JWT decode and _user_cache entirely
    if _is_service_token(token):
        return await _resolve_acting_user(x_act_as_user, db)

    # JWT path (unchanged)
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


async def require_service_token(
    token: str = Depends(oauth2_scheme),
) -> None:
    """Dependency for endpoints that require the Hermes service token (no impersonation)."""
    if not _is_service_token(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Service token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
