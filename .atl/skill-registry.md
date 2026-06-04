# Skill Registry — finpa

Generated: 2026-06-02
Project: finpa
Stack: FastAPI (Python 3.12) + Expo React Native (TypeScript, iOS)

---

## User Skills

| Skill | Trigger | Source |
|-------|---------|--------|
| branch-pr | When creating a pull request, opening a PR, or preparing changes for review | ~/.claude/skills/branch-pr |
| issue-creation | When creating a GitHub issue, reporting a bug, or requesting a feature | ~/.claude/skills/issue-creation |
| judgment-day | When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen" | ~/.claude/skills/judgment-day |
| skill-creator | When user asks to create a new skill, add agent instructions, or document patterns for AI | ~/.claude/skills/skill-creator |
| go-testing | When writing Go tests, using teatest, or adding test coverage | ~/.claude/skills/go-testing |

---

## Compact Rules

### branch-pr

```
BRANCH-PR RULES:
- Every PR MUST link an approved issue (status:approved label) — no exceptions
- Every PR MUST have exactly one type:* label
- Branch naming: type/description — regex ^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\/[a-z0-9._-]+$
- PR body MUST include: Closes #<issue-number>, Summary, Changes, Test Plan
- Run linters before PR: backend (ruff + ty), mobile (eslint + prettier)
- Automated checks must pass before merge
```

### issue-creation

```
ISSUE-CREATION RULES:
- Blank issues are disabled — MUST use a template (bug report or feature request)
- Every issue gets status:needs-review automatically on creation
- A maintainer MUST add status:approved before any PR can be opened
- Questions go to Discussions, not issues
- Search for duplicates before creating a new issue
```

### judgment-day

```
JUDGMENT-DAY RULES:
- Launch TWO independent blind judge sub-agents in parallel — never sequential
- Neither agent knows about the other — no cross-contamination
- Orchestrator synthesizes verdicts and applies fixes via a Fix Agent
- Re-judge after fixes; escalate after 2 failed iterations
- Inject project standards (compact rules from registry) into BOTH judge prompts
```

### skill-creator

```
SKILL-CREATOR RULES:
- Skills go in ~/.claude/skills/<name>/SKILL.md (user) or .claude/skills/<name>/SKILL.md (project)
- SKILL.md must have YAML frontmatter with: name, description, license, metadata (author, version)
- Trigger field in description is mandatory — tells orchestrator when to auto-invoke
- Keep compact rules under 15 lines per skill for registry injection efficiency
```

---

## Project Conventions (from CLAUDE.md)

### Backend (FastAPI/Python)
```
BACKEND RULES:
- Package manager: uv (pyproject.toml + uv.lock). Python 3.12+
- Linter: ruff (check + format). Type checker: ty. Run: cd backend && uv run ruff check . && uv run ruff format --check . && uv run ty check .
- Auto-fix: cd backend && uv run ruff check --fix . && uv run ruff format .
- All DB models use id (int PK, internal) + uuid (exposed to API). FKs use id; API URLs use uuid.
- JWT tokens encode user uuid in sub claim. bcrypt must be <5.0.0 (passlib 1.7.4 compat).
- Migrations: uv run alembic upgrade head (runs automatically on container startup)
- Google Sheets sync is optional — only for users with sync_to_sheets=true
```

### Mobile (Expo React Native/TypeScript)
```
MOBILE RULES:
- Expo SDK 54, iOS only (no Android). npm install --legacy-peer-deps required.
- Linter: ESLint 9 (flat config) + Prettier. Run: cd mobile && npm run lint && npm run format:check
- Auto-fix: cd mobile && npm run lint:fix && npm run format
- Distribution: EAS Build for iOS binary; EAS Update for OTA JS-only changes.
- newArchEnabled: false in app.json — required to avoid TurboModule errors in Expo SDK 54.
- runtimeVersion policy: appVersion — new native build required when app version bumps.
- State management: Zustand. Navigation: React Navigation drawer.
```

### Pre-commit Hooks
```
PRE-COMMIT RULES:
- All linters run automatically on git commit via pre-commit (.pre-commit-config.yaml)
- Hooks: trailing-whitespace, end-of-file-fixer, check-yaml, check-added-large-files, ruff, ruff-format, ty, eslint, prettier
- Manual run: pre-commit run --all-files
- Backend hooks: ruff + ruff-format + ty (files matching ^backend/)
- Mobile hooks: eslint + prettier (files matching ^mobile/)
```

### CI/CD
```
CI-CD RULES:
- CI runs on PRs to main and develop: backend lint (ruff+ty), mobile lint (eslint+prettier)
- CD runs on push to main: paths-filter detects changed dirs; backend deploys to Cloud Run; mobile pushes EAS OTA update
- Production: backend on Google Cloud Run + NeonDB; mobile via EAS Build/Update (iOS)
- New native build required for native config changes; EAS Update for JS-only changes
```
