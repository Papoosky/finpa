.PHONY: lint lint-backend lint-mobile format format-backend format-mobile typecheck check

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

# --- Mobile ---

lint-mobile:
	cd mobile && npx eslint --max-warnings=0 .

format-mobile:
	cd mobile && npx prettier --write "**/*.{ts,tsx,json}"

# --- Combined ---

lint: lint-backend lint-mobile

format: format-backend format-mobile
