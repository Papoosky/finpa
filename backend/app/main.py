from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import engine, Base
from app.routers import auth, transactions
from app.services.sheet_service import init_sheet_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables (Alembic will handle migrations in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    init_sheet_service()
    yield


app = FastAPI(
    title="Finpa API",
    description="API para registrar y consultar transacciones personales",
    lifespan=lifespan,
)

app.include_router(auth.router)
app.include_router(transactions.router)


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Finpa API is running"}
