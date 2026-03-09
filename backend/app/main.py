import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth, transactions
from app.services.sheet_service import init_sheet_service

_INSECURE_SECRETS = {"change-me-in-production", "secret", ""}


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
)

app.add_middleware(
    CORSMiddleware,  # ty: ignore[invalid-argument-type]  # Starlette typing issue with add_middleware
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(auth.admin_router)
app.include_router(transactions.router)


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Finpa API is running"}
