# finpa — Personal Finance Tracker

## Description
Add, list, edit, or delete personal finance transactions for Pablo or his partner via the Finpa API. Identify who is asking by their Telegram user ID.

## Configuration (set these in your environment or replace inline)
- `FINPA_API`: `https://fastapi-api-615500745879.us-central1.run.app`
- `FINPA_TOKEN`: value of `HERMES_SERVICE_TOKEN` (stored in your secrets)

## Step 1 — Resolve the Telegram user to a Finpa UUID

Before any transaction operation, you need the user's Finpa UUID. Use their Telegram user ID (the numeric ID, not the username).

```bash
curl -s -X GET "$FINPA_API/users/by-telegram/$TELEGRAM_ID" \
  -H "Authorization: Bearer $FINPA_TOKEN"
```

Response: `{"uuid": "...", "name": "..."}` — extract the `uuid` field.
If 404: that Telegram ID has no linked Finpa account.

## Step 2 — List transactions

```bash
curl -s "$FINPA_API/transactions/" \
  -H "Authorization: Bearer $FINPA_TOKEN" \
  -H "X-Act-As-User: $USER_UUID"
```

Optional query params: `?type=expense&category=food&limit=20&offset=0`

## Step 3 — Add a transaction

```bash
curl -s -X POST "$FINPA_API/transactions/" \
  -H "Authorization: Bearer $FINPA_TOKEN" \
  -H "X-Act-As-User: $USER_UUID" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 15000,
    "type": "expense",
    "category": "food",
    "description": "Almuerzo",
    "date": "2026-06-04"
  }'
```

- `amount`: integer in CLP (Chilean pesos), no decimals
- `type`: `"expense"` or `"income"`
- `category`: must be one of the valid categories (see Step 5)
- `description`: optional free text
- `date`: ISO 8601 (`YYYY-MM-DD`), defaults to today if omitted

## Step 4 — Edit a transaction

```bash
curl -s -X PATCH "$FINPA_API/transactions/$TRANSACTION_UUID" \
  -H "Authorization: Bearer $FINPA_TOKEN" \
  -H "X-Act-As-User: $USER_UUID" \
  -H "Content-Type: application/json" \
  -d '{"amount": 12000, "description": "Almuerzo corregido"}'
```

Only include fields you want to change. All fields are optional on PATCH.

## Step 5 — Delete a transaction

```bash
curl -s -X DELETE "$FINPA_API/transactions/$TRANSACTION_UUID" \
  -H "Authorization: Bearer $FINPA_TOKEN" \
  -H "X-Act-As-User: $USER_UUID"
```

## Step 6 — Get valid categories

```bash
curl -s "$FINPA_API/categories/" \
  -H "Authorization: Bearer $FINPA_TOKEN"
```

Returns `{income: [...], expense: [...]}` each with `{label, emoji}`.
Use `label` (lowercase) as the `category` field in transactions.

**Expense categories:** food, transport, housing, health, entertainment, clothing, education, personal_care, travel, subscriptions, gifts, other_expense

**Income categories:** salary, freelance, investment, rental, gift, other_income

## Notes
- Amounts are always integers (CLP has no decimal places)
- The `uuid` field is used in all API URLs, never the numeric `id`
- If the user doesn't specify a date, use today's date
- Confirm with the user before deleting
- When listing, summarize totals by category if there are more than 5 transactions
