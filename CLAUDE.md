# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Finpa** is a personal finance tracker. It has two components:
- `backend/` — FastAPI app that writes transactions to a Google Sheet
- `mobile/` — Expo (React Native) app with a transaction form, runs on iPhone via Expo Go

Both are containerized and run together via Docker Compose. The intended deployment target is a Proxmox home server (LXC or VM).

## Running the project

### Full stack (Docker)
```bash
# Requires a .env file at the repo root:
echo "SERVER_IP=<your-lan-ip>" > .env

docker compose up --build
```

- Backend: `http://SERVER_IP:8000`
- Mobile (Expo dev server): scan the QR from `docker logs finpa-mobile` with Expo Go

### Backend only (local dev)
```bash
cd backend
uv sync
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
- Entry point: `app/main.py` — single POST `/transactions/` endpoint
- `app/models/transaction.py` — Pydantic models. `TransactionType` enum: `income` | `expense`
- `app/services/sheet_service.py` — writes rows to the Google Sheet on init and per request
- Package manager: `uv` (pyproject.toml + uv.lock). Python 3.12+
- The Dockerfile uses `ghcr.io/astral-sh/uv:trixie` as base image

### Mobile
- Single screen: `App.tsx` — form with type toggle, amount, date, category, description
- `config.ts` — reads `EXPO_PUBLIC_API_URL` env var (baked in at Metro bundle time)
- Categories are hardcoded in `App.tsx`, split by transaction type
- Expo SDK 54, `--legacy-peer-deps` required for npm install

### Docker Compose
- `SERVER_IP` in `.env` is injected into the mobile container as both `REACT_NATIVE_PACKAGER_HOSTNAME` (so the QR code points to the right IP) and `EXPO_PUBLIC_API_URL` (so API calls reach the backend)

## Google Sheets setup
- Credentials file: `backend/credentials.json` (service account key, gitignored)
- Sheet ID: set via `GOOGLE_SHEETS_ID` env var in `docker-compose.yml`
- The sheet must have a worksheet named `transacciones`
- Headers are auto-created if the sheet is empty: `ID | Tipo | Fecha | Monto | Categoría | Descripción`

## Key constraints
- No database yet — Google Sheets is the only persistence layer (PostgreSQL planned for the future)
- iOS only (no Android testing)
- `newArchEnabled: false` in `app.json` — required to avoid TurboModule errors in Expo Go
