FROM ghcr.io/astral-sh/uv:trixie

WORKDIR /app

ENV UV_NO_DEV=1
ENV UV_LOCKED=1

COPY pyproject.toml uv.lock /app/
RUN uv sync

COPY alembic.ini /app/
COPY alembic/ /app/alembic/
COPY app/ /app/app/

CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --reload --reload-dir /app/app --host 0.0.0.0 --port 8000"]
