FROM ghcr.io/astral-sh/uv:trixie

WORKDIR /app

ENV UV_NO_DEV=1
ENV UV_LOCKED=1

COPY pyproject.toml uv.lock /app/
RUN uv sync

COPY app/ /app/app/

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
