FROM ghcr.io/astral-sh/uv:trixie

WORKDIR /app

ENV UV_NO_DEV=1
ENV UV_LOCKED=1

COPY pyproject.toml uv.lock /app/
RUN uv sync

COPY alembic.ini /app/
COPY alembic/ /app/alembic/
COPY app/ /app/app/

RUN useradd --create-home --shell /bin/false appuser && chown -R appuser:appuser /app
USER appuser

CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --workers 2 --host 0.0.0.0 --port 8000"]
