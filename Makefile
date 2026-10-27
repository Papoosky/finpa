.PHONY: lint lint-backend lint-mobile lint-web format format-backend format-mobile typecheck typecheck-web test-web build-web check

# Run all pre-commit hooks
check:
	pre-commit run --all-files

# --- Backend ---

lint-backend:
	cd backend && uv run ruff check .

format-backend:
	cd backend && uv run ruff check --fix . && uv run ruff format .

typecheck:
	cd backend && uv run ty check .

typecheck-web:
	cd web && pnpm typecheck

test-web:
	cd web && pnpm test

build-web:
	cd web && pnpm build

# --- Mobile ---

lint-mobile:
	cd mobile && npx eslint --max-warnings=0 .

lint-web:
	cd web && pnpm lint

format-mobile:
	cd mobile && npx prettier --write "**/*.{ts,tsx,json}"

# --- Combined ---

lint: lint-backend lint-mobile lint-web

format: format-backend format-mobile
