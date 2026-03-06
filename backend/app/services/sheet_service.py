import os
import uuid
import gspread
from app.models.transaction import TransactionCreate

HEADERS = ["ID", "Fecha", "Monto", "Categoría", "Descripción"]


class SheetService:
    def __init__(self):
        credentials_path = os.environ.get(
            "GOOGLE_CREDENTIALS_PATH", "/app/credentials.json"
        )
        spreadsheet_id = os.environ.get("GOOGLE_SHEETS_ID")

        gc = gspread.service_account(filename=credentials_path)
        spreadsheet = gc.open_by_key(spreadsheet_id)
        self.worksheet = spreadsheet.worksheet("transacciones")

        self._ensure_headers()

    def _ensure_headers(self):
        """Create header row if the sheet is empty."""
        first_row = self.worksheet.row_values(1)
        if not first_row:
            self.worksheet.append_row(HEADERS)

    def add_transaction(self, transaction: TransactionCreate) -> dict:
        """Append a transaction row to the Google Sheet."""
        row_id = str(uuid.uuid4())
        row = [
            row_id,
            transaction.date.isoformat(),
            transaction.amount,
            transaction.category,
            transaction.description or "",
        ]
        self.worksheet.append_row(row)

        return {
            "id": row_id,
            "amount": transaction.amount,
            "date": transaction.date,
            "category": transaction.category,
            "status": "success",
        }
