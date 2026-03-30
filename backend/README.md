# Finpa Backend

REST API for a personal finance tracker. Built with **FastAPI**, async **SQLAlchemy**, **PostgreSQL** (NeonDB in production), and optional **Google Sheets** sync.

## Stack

- **FastAPI** — web framework
- **SQLAlchemy 2 (async)** — ORM with asyncpg driver
- **Alembic** — database migrations
- **PostgreSQL 16** — primary storage (NeonDB in production, local container in dev)
- **python-jose + passlib/bcrypt** — JWT authentication
- **gspread** — optional Google Sheets sync
- **uv** — dependency management (Python 3.12+)
- **Ruff + ty** — linting, formatting, and type checking

## Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app entry point, lifespan, router includes
│   ├── database.py          # Async SQLAlchemy engine, session factory, Base
│   ├── auth.py              # JWT logic, get_current_user dependency
│   ├── models/
│   │   ├── user.py          # User model (id + uuid)
│   │   └── transaction.py   # Transaction model (id + uuid)
│   ├── schemas/             # Pydantic request/response schemas
│   ├── routers/
│   │   ├── auth.py          # POST /auth/register, POST /auth/login
│   │   └── transactions.py  # Full CRUD under /transactions/
│   └── services/
│       └── sheet_service.py # Optional Google Sheets sync
├── alembic/                 # Migrations
├── credentials.json         # GCP service account key (gitignored)
├── Dockerfile
└── pyproject.toml
```

## API Endpoints

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/` | Health check | No |
| POST | `/auth/register` | Register a new user | No |
| POST | `/auth/login` | Login → returns JWT | No |
| POST | `/transactions/` | Create a transaction | Bearer |
| GET | `/transactions/` | List transactions (filterable) | Bearer |
| GET | `/transactions/{uuid}` | Get a single transaction | Bearer |
| PATCH | `/transactions/{uuid}` | Update a transaction | Bearer |
| DELETE | `/transactions/{uuid}` | Delete a transaction | Bearer |

Interactive docs available at `/docs` when running locally.

## Running locally

### With Docker (recommended)

```bash
# From repo root
docker compose up --build
```

API available at `http://localhost:8000`.

### Standalone (against NeonDB or local Postgres)

```bash
uv sync
DATABASE_URL=postgresql+asyncpg://<connection-string> uv run alembic upgrade head
DATABASE_URL=postgresql+asyncpg://<connection-string> \
  SECRET_KEY=<your-key> \
  uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | `postgresql+asyncpg://...` — NeonDB in prod, local container in dev |
| `SECRET_KEY` | Yes | JWT signing key (`openssl rand -hex 32`) |
| `ADMIN_SECRET` | Yes | Secret required to register new users |
| `REGISTRATION_ENABLED` | No | `false` by default — set `true` to allow open registration |
| `ENV` | No | `development` or `production` (default `production`) |
| `GOOGLE_SHEETS_ID` | No | Google Sheets spreadsheet ID — sheet sync disabled if unset |
| `GOOGLE_CREDENTIALS_PATH` | No | Path to GCP service account JSON (default `/app/credentials.json`) |

## Linting & formatting

```bash
# Check
uv run ruff check . && uv run ruff format --check . && uv run ty check .

# Auto-fix
uv run ruff check --fix . && uv run ruff format .
```

## Migrations

```bash
# Apply all pending migrations
uv run alembic upgrade head

# Create a new migration after model changes
uv run alembic revision --autogenerate -m "describe the change"
```

## Google Sheets sync (optional)

- Place a GCP service account key at `backend/credentials.json` (gitignored)
- Set `GOOGLE_SHEETS_ID` in your `.env`
- The target spreadsheet must have a worksheet named `transacciones`
- Sync only runs for users with `sync_to_sheets=true` in their profile
- Headers are auto-created on first sync if the sheet is empty
