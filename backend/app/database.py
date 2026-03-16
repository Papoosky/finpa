import os
import re
import ssl

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

_raw_url = os.environ.get(
    "DATABASE_URL", "postgresql+asyncpg://finpa:finpa@localhost:5432/finpa"
)

# asyncpg doesn't accept libpq params like sslmode or channel_binding — strip them
# and handle SSL via connect_args instead
_SSL_PARAMS = re.compile(r"[?&](sslmode|channel_binding)=[^&]*")
DATABASE_URL = _SSL_PARAMS.sub("", _raw_url).rstrip("?&")

_connect_args: dict = {}
if (
    "sslmode=require" in _raw_url
    or "ssl=require" in _raw_url
    or "neon.tech" in _raw_url
):
    _connect_args["ssl"] = ssl.create_default_context()

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args=_connect_args,
    pool_size=int(os.environ.get("DB_POOL_SIZE", "3")),
    max_overflow=int(os.environ.get("DB_MAX_OVERFLOW", "2")),
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True,
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session
