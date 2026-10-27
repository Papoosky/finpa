# Finpa

Personal finance tracker with multi-user support. Track income and expenses, visualize spending patterns, and optionally sync to Google Sheets.

**Production**: Backend on an Oracle VM behind Cloudflare Tunnel with NeonDB. A new web client is being introduced at `finpa.pzuni.com`; the Expo iOS client remains available during the migration.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐
│ Web / Mobile    │────▶│   Backend API   │────▶│  PostgreSQL  │
│ React + Expo    │     │    FastAPI      │     │              │
│                 │     │                 │──┬─▶│  (primary)   │
└─────────────────┘     └─────────────────┘  │  └──────────────┘
                                             │
                                             └─▶ Google Sheets
                                                  (optional)
```

| Component | Stack |
|-----------|-------|
| **Backend** | FastAPI, SQLAlchemy (async), PostgreSQL 16, Alembic, JWT auth |
| **Web** | React, TypeScript, Vite, TanStack Router + Query, Tailwind CSS |
| **Mobile** | Expo SDK 54, React Native, React Navigation (Drawer), Zustand, Victory Native |
| **Infra (dev)** | Docker Compose, uv (Python), npm |
| **Infra (prod)** | Oracle VM + Cloudflare Tunnel (API), NeonDB, Cloudflare Workers (web), EAS (legacy mobile) |

## Quick Start (Local Dev)

### Prerequisites

- Docker & Docker Compose
- pnpm 10.33.2 for the web client (`corepack enable`)
- iPhone with the EAS-built Finpa binary installed (or [Expo Go](https://apps.apple.com/app/expo-go/id982107779) for quick dev iterations)

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set:

```env
SERVER_IP=<your-lan-ip>          # e.g. 192.168.1.100
SECRET_KEY=<random-hex-string>   # openssl rand -hex 32
POSTGRES_PASSWORD=<strong-pass>
```

### 2. Launch

```bash
docker compose up --build
```

- **Backend API**: `http://<SERVER_IP>:8000`
- **API docs** (dev mode): `http://<SERVER_IP>:8000/docs` (set `ENV=development` in `.env`)
- **Mobile**: Scan the QR from `docker logs finpa-mobile` with Expo Go

### 3. Create a user

Registration is disabled by default in production. Options:

```bash
# Option A: Enable public registration
echo "REGISTRATION_ENABLED=true" >> .env
docker compose up -d backend

# Option B: Use admin endpoint (set ADMIN_SECRET in .env first)
curl -X POST http://<SERVER_IP>:8000/admin/users \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: <your-admin-secret>" \
  -d '{"email": "you@example.com", "password": "yourpassword", "name": "Your Name"}'
```

## Local Development

### Backend

```bash
cd backend

# Start only the database
docker compose up db -d

# Install deps and run
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Mobile

```bash
cd mobile
npm install --legacy-peer-deps
EXPO_PUBLIC_API_URL=http://<your-ip>:8000 npx expo start --port 8081 --host lan
```

Scan the QR code with Expo Go on your iPhone.

### Web

```bash
cd web
pnpm install
cp .env.example .env.local
pnpm dev
```

The web client runs at `http://localhost:5173` and calls the API configured in `VITE_API_URL`. It includes the dashboard, transaction CRUD and installments, history, subscriptions, dark mode, and responsive mobile navigation.

Checks:

```bash
cd web
pnpm typecheck
pnpm test
pnpm build
```

Production is configured as a Cloudflare Workers static-assets SPA in `web/wrangler.jsonc`. Deployment remains disabled until `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are configured in GitHub.

## API

All endpoints except auth require `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Create account (if enabled) |
| `POST` | `/auth/login` | Get access token |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/transactions/` | Create transaction |
| `GET` | `/transactions/` | List (supports `date_from`, `date_to`, `type` filters) |
| `GET` | `/transactions/{uuid}` | Get by UUID |
| `PATCH` | `/transactions/{uuid}` | Update |
| `DELETE` | `/transactions/{uuid}` | Delete |

## Mobile App

### Distribution

- **Production binary**: built and distributed via **EAS Build** (iOS only)
- **OTA updates**: JS/asset changes are pushed via `eas update --branch production` — no App Store submission needed
- **`runtimeVersion` policy**: `appVersion` — a new native build is required only when the Expo app version bumps (e.g. new native modules or config changes)

### Screens

Three screens accessible via drawer navigation:

- **Dashboard** — Monthly/annual view with income, expense, and balance cards. Bar chart (monthly) and line + pie charts (annual).
- **Transaction** — Create or edit transactions with type toggle, amount, date, category, and description.
- **History** — Transaction list grouped by date with swipe-to-edit and swipe-to-delete.

Features: dark/light theme toggle, skeleton loaders, pull-to-refresh, haptic feedback, toast notifications.

## CI/CD

| Trigger | Action |
|---------|--------|
| PR to `main` or `develop` | Check backend, mobile, and web |
| Release tag `finpa-v*.*.*` | Deploy the backend to Oracle and the web SPA to Cloudflare Workers |

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `RELEASE_PLEASE_TOKEN` | Fine-grained PAT used to create release tags |
| `CLOUDFLARE_API_TOKEN` | Workers deployment token (required when enabling web deploy) |

The `CLOUDFLARE_ACCOUNT_ID` repository variable enables the web deployment job. Backend runtime secrets remain in `/opt/finpa/.env` on the Oracle VM.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SERVER_IP` | Yes | — | LAN IP for mobile to reach backend |
| `SECRET_KEY` | Yes | — | JWT signing key |
| `POSTGRES_PASSWORD` | Yes | — | Database password |
| `POSTGRES_USER` | No | `finpa` | Database user |
| `POSTGRES_DB` | No | `finpa` | Database name |
| `ENV` | No | `production` | Set `development` for Swagger UI |
| `REGISTRATION_ENABLED` | No | `false` | Allow public registration |
| `ADMIN_SECRET` | No | — | Secret for admin user creation endpoint |
| `WEB_ORIGINS` | No | `https://finpa.pzuni.com` in production | Comma-separated browser origins allowed by CORS |
| `GOOGLE_SHEETS_ID` | No | — | Spreadsheet ID for sync |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `10080` | JWT access token lifetime (7 days; shorten after the web cutover) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `7` | Refresh token lifetime |

## Google Sheets Sync (Optional)

1. Create a Google Cloud service account and download the JSON key
2. Save it as `backend/credentials.json` (gitignored)
3. Share your spreadsheet with the service account email
4. Set `GOOGLE_SHEETS_ID` in `.env`

The sheet must have a worksheet named `transacciones`. Headers are auto-created on first sync.

## Linting & Formatting

```bash
# Backend
cd backend
uv run ruff check . && uv run ruff format --check . && uv run ty check .

# Mobile
cd mobile
npm run lint && npm run format:check

# Web
cd web
pnpm typecheck && pnpm test && pnpm build

# Auto-fix
cd backend && uv run ruff check --fix . && uv run ruff format .
cd mobile && npm run lint:fix && npm run format
```

Pre-commit hooks run all linters automatically on `git commit`.

## Project Structure

```
finpa/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app with lifespan
│   │   ├── database.py          # Async SQLAlchemy engine
│   │   ├── auth.py              # JWT auth (PyJWT + passlib/bcrypt)
│   │   ├── models/              # SQLAlchemy models (User, Transaction)
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── routers/             # Auth + Transactions endpoints
│   │   └── services/            # Google Sheets sync service
│   ├── alembic/                 # Database migrations
│   ├── pyproject.toml           # Python deps (uv)
│   └── Dockerfile
├── web/
│   ├── src/                     # React routes, components, API client, and auth
│   ├── public/                  # PWA manifest and icon
│   ├── wrangler.jsonc           # Cloudflare Workers static-assets config
│   └── package.json
├── mobile/
│   ├── App.tsx                  # Entry: ThemeProvider + auth gate + drawer
│   ├── screens/                 # AuthScreen, Dashboard, Transaction, History
│   ├── components/
│   │   ├── ui/                  # Design system (Button, Card, Input, Text, etc.)
│   │   ├── SummaryCards.tsx     # Income/expense/balance cards
│   │   ├── ChartCard.tsx        # Chart wrapper
│   │   ├── CategoryModal.tsx    # Category picker
│   │   └── TransactionRow.tsx   # Swipeable transaction row
│   ├── hooks/                   # useTransactions, useDashboard, useHaptics
│   ├── stores/                  # Zustand (authStore, themeStore)
│   ├── services/api.ts          # Fetch wrapper with auto-auth
│   ├── theme/                   # Tokens, ThemeProvider, createStyles
│   ├── types/                   # Shared TypeScript types
│   └── constants/categories.ts  # Transaction categories
├── docker-compose.yml
├── .env.example
└── .pre-commit-config.yaml
```

## License

Private project.
