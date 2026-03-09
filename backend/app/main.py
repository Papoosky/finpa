import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.database import Base, engine
from app.routers import auth, transactions
from app.services.sheet_service import init_sheet_service

limiter = Limiter(key_func=get_remote_address)

_INSECURE_SECRETS = {"change-me-in-production", "secret", ""}
_IS_PRODUCTION = os.environ.get("ENV", "production") == "production"


@asynccontextmanager
async def lifespan(app: FastAPI):
    secret = os.environ.get("SECRET_KEY", "")
    if secret in _INSECURE_SECRETS or len(secret) < 32:
        raise RuntimeError(
            "SECRET_KEY is missing, insecure, or too short (min 32 chars). "
            "Generate one with: openssl rand -hex 32"
        )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    init_sheet_service()
    yield


app = FastAPI(
    title="Finpa API",
    description="API para registrar y consultar transacciones personales",
    lifespan=lifespan,
    docs_url=None if _IS_PRODUCTION else "/docs",
    redoc_url=None if _IS_PRODUCTION else "/redoc",
    openapi_url=None if _IS_PRODUCTION else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,  # ty: ignore[invalid-argument-type]  # Starlette typing issue with add_middleware
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Demasiadas solicitudes. Intenta de nuevo mas tarde."},
    )


app.include_router(auth.router)
app.include_router(auth.admin_router)
app.include_router(transactions.router)


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Finpa API is running"}
