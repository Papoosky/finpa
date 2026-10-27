import logging
import os

from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    Header,
    HTTPException,
    Request,
    Response,
    status,
)
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

logger = logging.getLogger("finpa.security")

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["auth"])

REGISTRATION_ENABLED = os.environ.get("REGISTRATION_ENABLED", "true").lower() == "true"
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "")
REFRESH_COOKIE_NAME = "finpa_refresh_token"
REFRESH_COOKIE_MAX_AGE = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7")) * 86400
IS_PRODUCTION = os.environ.get("ENV", "production") == "production"


def _allowed_web_origins() -> set[str]:
    configured = os.environ.get("WEB_ORIGINS", "")
    if configured:
        return {
            origin.strip().rstrip("/")
            for origin in configured.split(",")
            if origin.strip()
        }
    if IS_PRODUCTION:
        return {"https://finpa.pzuni.com"}
    return {"http://localhost:5173", "http://127.0.0.1:5173"}


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        max_age=REFRESH_COOKIE_MAX_AGE,
        path="/auth",
        secure=IS_PRODUCTION,
        httponly=True,
        samesite="lax",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/auth",
        secure=IS_PRODUCTION,
        httponly=True,
        samesite="lax",
    )


def _validate_cookie_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if origin and origin.rstrip("/") not in _allowed_web_origins():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Origen no permitido",
        )


def _token_response(
    request: Request,
    response: Response,
    access_token: str,
    refresh_token: str,
) -> TokenResponse:
    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(
        access_token=access_token,
        refresh_token=(
            None if request.headers.get("x-finpa-client") == "web" else refresh_token
        ),
    )


async def _create_user(
    request: Request,
    response: Response,
    body: RegisterRequest,
    db: AsyncSession,
) -> TokenResponse:
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

    logger.info("user_registered email=%s uuid=%s", body.email, user.uuid)

    refresh = await create_refresh_token(user.id, db)
    return _token_response(
        request,
        response,
        create_access_token(user.uuid),
        refresh,
    )


@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit("3/minute")
async def register(
    request: Request,
    response: Response,
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    if not REGISTRATION_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registro deshabilitado",
        )
    return await _create_user(request, response, body, db)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        logger.warning(
            "login_failed email=%s ip=%s",
            form_data.username,
            request.client.host if request.client else "unknown",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    logger.info(
        "login_success email=%s ip=%s",
        form_data.username,
        request.client.host if request.client else "unknown",
    )

    refresh = await create_refresh_token(user.id, db)
    return _token_response(
        request,
        response,
        create_access_token(user.uuid),
        refresh,
    )


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
async def refresh(
    request: Request,
    response: Response,
    body: RefreshRequest | None = None,
    cookie_refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
):
    raw_token = body.refresh_token if body else cookie_refresh_token
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token requerido",
        )
    if body is None:
        _validate_cookie_origin(request)

    refresh_record = await verify_refresh_token(raw_token, db)
    user_id = refresh_record.user_id  # capture before commit expires the record

    # Rotate: revoke old, issue new
    refresh_record.revoked = True
    await db.commit()

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one()
    new_refresh = await create_refresh_token(user.id, db)
    return _token_response(
        request,
        response,
        create_access_token(user.uuid),
        new_refresh,
    )


@router.post("/logout", status_code=204)
@limiter.limit("10/minute")
async def logout(
    request: Request,
    response: Response,
    body: LogoutRequest | None = None,
    cookie_refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
):
    raw_token = body.refresh_token if body else cookie_refresh_token
    if body is None:
        _validate_cookie_origin(request)
    if raw_token:
        await revoke_refresh_token(raw_token, db)
    _clear_refresh_cookie(response)


admin_router = APIRouter(prefix="/admin", tags=["admin"])


@admin_router.post("/users", response_model=TokenResponse, status_code=201)
@limiter.limit("3/minute")
async def admin_create_user(
    request: Request,
    response: Response,
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    x_admin_secret: str = Header(),
):
    if not ADMIN_SECRET or x_admin_secret != ADMIN_SECRET:
        logger.warning(
            "admin_create_user_denied ip=%s",
            request.client.host if request.client else "unknown",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin secret invalido",
        )
    logger.info(
        "admin_create_user email=%s ip=%s",
        body.email,
        request.client.host if request.client else "unknown",
    )
    return await _create_user(request, response, body, db)
