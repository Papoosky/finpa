# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project overview

**Finpa** is a personal finance tracker with multi-user support. It has two components:
- `backend/` — FastAPI app with PostgreSQL (primary) and optional Google Sheets sync
- `mobile/` — Expo (React Native) app with a transaction form, distributed via EAS Build (iOS)

**Environments:**
- **Local dev**: Docker Compose with a local PostgreSQL container
- **Production**: Backend on an Oracle VM using Docker Compose from `/opt/finpa`, with NeonDB (serverless PostgreSQL); mobile distributed via EAS Build with OTA updates via EAS Update

## Running the project

### Option A — Full stack with Docker (local dev)

Uses a local PostgreSQL container. Suitable for full offline development.

```bash
# .env at repo root (minimum required):
SERVER_IP=<your-lan-ip>
SECRET_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=<choose-a-password>
ADMIN_SECRET=$(openssl rand -hex 24)

docker compose up --build        # dev mode (hot reload, override applied automatically)
docker compose -f docker-compose.yml up --build  # production mode (no hot reload)
```

- Backend: `http://SERVER_IP:8000`
- Mobile (Expo dev server): scan the QR from `docker logs finpa-mobile` with Expo Go

### Option B — Backend only against NeonDB (production-like)

Point `DATABASE_URL` at your Neon connection string to run locally against the same DB as production.

```bash
cd backend
uv sync
DATABASE_URL=postgresql+asyncpg://<neon-connection-string> uv run alembic upgrade head
DATABASE_URL=postgresql+asyncpg://<neon-connection-string> \
  SECRET_KEY=<your-key> \
  uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Mobile — local dev (Expo dev server)

```bash
cd mobile
npm install --legacy-peer-deps
EXPO_PUBLIC_API_URL=http://<your-ip>:8000 npx expo start --port 8081 --host lan
```

Scan the QR with the **Expo Go** app or with a device that has the EAS-built binary installed.

### Mobile — production build (EAS Build)

The production iOS binary is built and distributed via EAS Build. OTA JS updates are pushed via EAS Update (no App Store submission needed for JS-only changes).

```bash
cd mobile
# First-time setup — logs in and links the project
npx eas-cli login

# Build a new binary (e.g. after native config changes)
npx eas build --platform ios --profile production

# Push an OTA JS update (CI does this automatically on release tag push, e.g. `finpa-v1.2.3`)
npx eas update --branch production --message "describe the change"
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
- `app.json` — EAS project config (`projectId`, `runtimeVersion`, OTA update URL)
- Expo SDK 54, `--legacy-peer-deps` required for npm install
- **Distribution**: EAS Build for the iOS binary; EAS Update (`eas update --branch production`) for OTA JS updates
- `runtimeVersion` policy: `appVersion` — a new native build is required when the app version bumps

### Docker Compose
- `docker-compose.yml` — base config (production-safe): `db` (Postgres 16), `backend`, `mobile`
- `docker-compose.override.yml` — dev overrides applied automatically: volume mounts for hot reload, uvicorn `--reload`, `ENV=development`
- `docker-compose.prod.yml` — Oracle production stack: private `backend` plus the Finpa-owned `finpa-cloudflared` ingress sidecar; no backend ports are published on the host and there is no dependency on Stayloyal
- The Cloudflare Tunnel routes `finpa-api.pzuni.com` to `http://backend:8080` on the private Compose network
- `db` service: PostgreSQL 16 with persistent volume (`pgdata`) — **used in local dev only**; production uses NeonDB
- `backend` depends on `db` with healthcheck (`pg_isready`), runs alembic migrations on startup
- `DATABASE_URL` defaults to the local `db` container; override with a Neon connection string for production-like local runs
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
- **Dual-mode `get_current_user`**: accepts either a user JWT or the static `HERMES_SERVICE_TOKEN`. When the service token is presented, the `X-Act-As-User: <user_uuid>` header is required to identify the acting user. JWT callers never need this header.
- `GET /categories` and `GET /users/by-telegram/{telegram_id}` are service-token-only endpoints (use `require_service_token` dependency).

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
- Triggered by **tag push** matching `finpa-v*.*.*` (created by release-please) and by manual `workflow_dispatch`. **Not** triggered by pushes to `main`.
- No paths-filter: every release tag deploys BOTH backend and mobile unconditionally. Accepted tradeoff: ~2-3 min of idempotent rebuild on the unaffected side per release; zero "no-op CD" failure modes; no more `chore: trigger redeploy` commits.
- **Backend deploy**: runs on the Oracle self-hosted runner labeled `[self-hosted, oracle, finpa]`, syncs the repository to `/opt/finpa` while preserving its runtime `.env`, and starts `docker-compose.prod.yml`. Alembic migrations run automatically on container startup (Dockerfile CMD).
- **Mobile deploy**: `eas update --branch production` to push an OTA update.
- `concurrency: { group: cd, cancel-in-progress: false }` — back-to-back tags queue serially; in-flight deploys are never killed mid-rollout.

### release-please (`.github/workflows/release-please.yml`)
- Triggered on every push to `main`.
- Opens (or updates) a single open Release PR titled `chore(release): finpa X.Y.Z` whose body is the auto-generated CHANGELOG diff.
- Merging the Release PR creates tag `finpa-vX.Y.Z` and a GitHub Release; the tag push fires `cd.yml`.

#### PAT footgun (READ THIS)
- release-please MUST authenticate with a **fine-grained PAT** stored as `RELEASE_PLEASE_TOKEN`, **not** the default `GITHUB_TOKEN`.
- Why: GitHub's security model blocks events created by `GITHUB_TOKEN` from triggering downstream workflows. If release-please uses `GITHUB_TOKEN`, the tag it pushes will **silently skip** `cd.yml` — no error, no deploy.
- Symptom of misconfiguration: Release PR merges, tag appears, GitHub Release appears, but CD never runs. If you see this, check `release-please.yml` token line first.

#### Manual PAT setup (one-time)
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
2. Repository access: only this repo (`finpa`).
3. Permissions: `Contents: Read and write`, `Pull requests: Read and write`. Nothing else.
4. Expiration: 1 year (max for fine-grained PATs). Add a calendar reminder ~2 weeks before expiry.
5. Copy the token; in the repo → Settings → Secrets and variables → Actions → New repository secret → name `RELEASE_PLEASE_TOKEN`, paste value.

#### PAT rotation
- Fine-grained PATs expire (max 1 year). When `RELEASE_PLEASE_TOKEN` expires, `release-please.yml` fails with a `401` on the action step. Recovery: regenerate per the steps above; update the secret. No code change needed.
- No automation is in place for rotation. Calendar reminder is the safety net.

### Required GitHub Secrets
| Secret | Description |
|---|---|
| `EXPO_TOKEN` | Expo access token for EAS CLI (generate with `npx eas-cli login` then `expo token:create`) |
| `RELEASE_PLEASE_TOKEN` | Fine-grained PAT (Contents: write, Pull requests: write). Required so release-please tag pushes can trigger `cd.yml`. See "release-please → PAT footgun" above. |

### Oracle runtime environment
- Backend configuration and secrets live in `/opt/finpa/.env` on the Oracle VM; CD deliberately preserves this file instead of sourcing these values from GitHub Secrets.
- Required values include `DATABASE_URL`, `SECRET_KEY`, and `CLOUDFLARE_TUNNEL_TOKEN`. The tunnel token is injected into the `finpa-cloudflared` container as `TUNNEL_TOKEN` and must never be committed or placed in command arguments.
- `ADMIN_SECRET` and `HERMES_SERVICE_TOKEN` also belong in the Oracle runtime `.env` when those integrations are enabled.

## Key conventions
- All DB models use `id` (integer PK, internal) and `uuid` (exposed to API/clients). Joins and FKs use `id`; API responses and URL params use `uuid`
- JWT tokens encode the user's `uuid` in the `sub` claim
- `passlib 1.7.4` + `bcrypt 4.x` produces a harmless log warning about `bcrypt.__about__` — this is cosmetic and can be ignored

## Key constraints
- PostgreSQL is the primary persistence layer, Google Sheets is an optional sync target
- iOS only (no Android testing or builds)
- `newArchEnabled: false` in `app.json` — required to avoid TurboModule errors in Expo SDK 54
- `bcrypt` must be pinned to `<5.0.0` due to passlib 1.7.4 incompatibility
- EAS Update OTA only works for JS/asset changes; native changes (new packages with native modules, config changes) require a new `eas build`
