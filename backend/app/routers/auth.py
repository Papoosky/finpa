import os

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (
    create_access_token,
    create_refresh_token,
    hash_password,
    revoke_refresh_token,
    verify_password,
    verify_refresh_token,
)
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["auth"])

REGISTRATION_ENABLED = os.environ.get("REGISTRATION_ENABLED", "true").lower() == "true"
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "")


async def _create_user(body: RegisterRequest, db: AsyncSession) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email ya registrado")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        name=body.name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    refresh = await create_refresh_token(user.id, db)
    return TokenResponse(
        access_token=create_access_token(user.uuid),
        refresh_token=refresh,
    )


@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit("3/minute")
async def register(
    request: Request, body: RegisterRequest, db: AsyncSession = Depends(get_db)
):
    if not REGISTRATION_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registro deshabilitado",
        )
    return await _create_user(body, db)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    refresh = await create_refresh_token(user.id, db)
    return TokenResponse(
        access_token=create_access_token(user.uuid),
        refresh_token=refresh,
    )


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
async def refresh(
    request: Request, body: RefreshRequest, db: AsyncSession = Depends(get_db)
):
    refresh_record = await verify_refresh_token(body.refresh_token, db)

    # Rotate: revoke old, issue new
    refresh_record.revoked = True
    await db.commit()

    user = refresh_record.user
    new_refresh = await create_refresh_token(user.id, db)
    return TokenResponse(
        access_token=create_access_token(user.uuid),
        refresh_token=new_refresh,
    )


@router.post("/logout", status_code=204)
@limiter.limit("10/minute")
async def logout(
    request: Request, body: LogoutRequest, db: AsyncSession = Depends(get_db)
):
    await revoke_refresh_token(body.refresh_token, db)


admin_router = APIRouter(prefix="/admin", tags=["admin"])


@admin_router.post("/users", response_model=TokenResponse, status_code=201)
@limiter.limit("3/minute")
async def admin_create_user(
    request: Request,
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    x_admin_secret: str = Header(),
):
    if not ADMIN_SECRET or x_admin_secret != ADMIN_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin secret invalido",
        )
    return await _create_user(body, db)
