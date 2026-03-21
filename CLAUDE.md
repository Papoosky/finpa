# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Finpa** is a personal finance tracker with multi-user support. It has two components:
- `backend/` — FastAPI app with PostgreSQL (primary) and optional Google Sheets sync
- `mobile/` — Expo (React Native) app with a transaction form, runs on iPhone via Expo Go

Both are containerized and run together via Docker Compose for local development. Production deployment uses Google Cloud Run (backend) and EAS Update (mobile).

## Running the project

### Full stack (Docker)
```bash
# Requires a .env file at the repo root:
echo "SERVER_IP=<your-lan-ip>" > .env
echo "SECRET_KEY=$(openssl rand -hex 32)" >> .env

docker compose up --build
```

- Backend: `http://SERVER_IP:8000`
- Mobile (Expo dev server): scan the QR from `docker logs finpa-mobile` with Expo Go

### Backend only (local dev)
```bash
cd backend
# Start a local postgres (or use Docker: docker compose up db)
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Mobile only (local dev)
```bash
cd mobile
npm install --legacy-peer-deps
EXPO_PUBLIC_API_URL=http://<your-ip>:8000 npx expo start --port 8081 --host lan
```

## Architecture

### Backend
- Entry point: `app/main.py` — FastAPI app with lifespan, includes auth + transactions routers
- `app/database.py` — async SQLAlchemy engine, session factory, Base class
- `app/auth.py` — JWT auth (python-jose + passlib/bcrypt), `get_current_user` dependency
- `app/models/` — SQLAlchemy models: `User`, `Transaction`. Both use `id` (autoincrement int, internal) + `uuid` (UUID, exposed in API)
- `app/schemas/` — Pydantic schemas for request/response validation
- `app/routers/auth.py` — `POST /auth/register`, `POST /auth/login`
- `app/routers/transactions.py` — full CRUD: `POST`, `GET` (list with filters), `GET /{uuid}`, `PATCH /{uuid}`, `DELETE /{uuid}`
- `app/services/sheet_service.py` — optional Google Sheets sync (only for users with `sync_to_sheets=true`)
- `alembic/` — database migrations. Run `uv run alembic upgrade head` to apply
- Package manager: `uv` (pyproject.toml + uv.lock). Python 3.12+
- The Dockerfile uses `ghcr.io/astral-sh/uv:trixie` as base image

### Mobile
- `App.tsx` — navigation setup (drawer with Dashboard, Transaction, History screens)
- `screens/TransactionScreen.tsx` — form with type toggle, amount, date, category, description
- `config.ts` — reads `EXPO_PUBLIC_API_URL` env var (baked in at Metro bundle time)
- `constants/categories.ts` — expense and income categories with emoji mappings
- Expo SDK 54, `--legacy-peer-deps` required for npm install
- EAS configured for OTA updates (`eas update --branch production`)

### Docker Compose
- `db` service: PostgreSQL 16 with persistent volume (`pgdata`)
- `backend` depends on `db` with healthcheck (`pg_isready`), runs alembic migrations on startup
- `SERVER_IP` in `.env` is injected into the mobile container for QR code and API URL
- `SECRET_KEY` in `.env` is used for JWT signing
- `GOOGLE_SHEETS_ID` is optional — if unset, sheet sync is disabled

## Google Sheets setup (optional)
- Credentials file: `backend/credentials.json` (service account key, gitignored)
- Sheet ID: set via `GOOGLE_SHEETS_ID` env var in `.env`
- The sheet must have a worksheet named `transacciones`
- Headers are auto-created if the sheet is empty
- Only syncs for users with `sync_to_sheets=true` in their profile

## Auth
- JWT-based authentication with bcrypt password hashing
- Register: `POST /auth/register` with `{email, password, name}`
- Login: `POST /auth/login` with `{email, password}` → returns `{access_token, token_type}`
- All `/transactions/` endpoints require `Authorization: Bearer <token>` header
- Transactions are scoped to the authenticated user (full isolation)

## Linting & formatting

### Backend
- **Ruff** for linting and formatting. Config in `backend/pyproject.toml` under `[tool.ruff]`
- **ty** for type checking (Astral's type checker, pre-1.0). Config in `backend/pyproject.toml` under `[tool.ty]`
- Run: `cd backend && uv run ruff check . && uv run ruff format --check . && uv run ty check .`
- Auto-fix: `cd backend && uv run ruff check --fix . && uv run ruff format .`

### Mobile
- **ESLint 9** (flat config) + **Prettier** for linting and formatting
- Config: `mobile/eslint.config.mjs`, `mobile/.prettierrc`
- Run: `cd mobile && npm run lint && npm run format:check`
- Auto-fix: `cd mobile && npm run lint:fix && npm run format`

### Pre-commit hooks
- All linters run automatically on `git commit` via pre-commit
- Config: `.pre-commit-config.yaml`
- Manual run: `pre-commit run --all-files`
- Hooks: trailing-whitespace, end-of-file-fixer, check-yaml, check-added-large-files, ruff, ruff-format, ty, eslint, prettier

### Docker hot reload
- Backend: uvicorn runs with `--reload` — edit files in `backend/app/` and changes are picked up automatically
- Mobile: source code is volume-mounted — Expo Fast Refresh picks up changes without container rebuild
- New npm/pip deps still require `docker compose build <service>`

## CI/CD

### CI (`.github/workflows/ci.yml`)
- Runs on PRs to `main` and `develop`
- **Backend lint job**: ruff check, ruff format --check, ty check
- **Mobile lint job**: eslint, prettier

### CD (`.github/workflows/cd.yml`)
- Runs on push to `main` (i.e., after merging a PR)
- Uses `dorny/paths-filter` to detect which directories changed
- **Backend deploy** (if `backend/**` changed): deploys to Google Cloud Run via `gcloud run deploy`. Alembic migrations run automatically on container startup (Dockerfile CMD)
- **Mobile deploy** (if `mobile/**` changed): runs `eas update --branch production` to push an OTA update

### Required GitHub Secrets
| Secret | Description |
|---|---|
| `GCP_SA_KEY` | Google Cloud service account JSON key (needs Cloud Run Admin + Storage Admin roles) |
| `DATABASE_URL` | Neon PostgreSQL connection string (`postgresql+asyncpg://...`) |
| `SECRET_KEY` | Fixed JWT signing key (generate once with `openssl rand -hex 32`) |
| `ADMIN_SECRET` | Fixed admin secret (generate once with `openssl rand -hex 24`) |
| `EXPO_TOKEN` | Expo access token for EAS CLI (generate with `npx eas-cli login` then `expo token:create`) |

## Key conventions
- All DB models use `id` (integer PK, internal) and `uuid` (exposed to API/clients). Joins and FKs use `id`; API responses and URL params use `uuid`
- JWT tokens encode the user's `uuid` in the `sub` claim
- `passlib 1.7.4` + `bcrypt 4.x` produces a harmless log warning about `bcrypt.__about__` — this is cosmetic and can be ignored

## Key constraints
- PostgreSQL is the primary persistence layer, Google Sheets is an optional sync target
- iOS only (no Android testing)
- `newArchEnabled: false` in `app.json` — required to avoid TurboModule errors in Expo Go
- `bcrypt` must be pinned to `<5.0.0` due to passlib 1.7.4 incompatibility
