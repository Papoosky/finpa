import logging
import os
from typing import Optional

import gspread

logger = logging.getLogger(__name__)

HEADERS = ["ID", "Tipo", "Fecha", "Monto", "Categoria", "Descripcion"]

_sheet_service: Optional["SheetService"] = None


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
        first_row = self.worksheet.row_values(1)
        if not first_row:
            self.worksheet.append_row(HEADERS)

    def add_transaction(self, txn) -> None:
        row = [
            str(txn.id),
            txn.type,
            txn.date.isoformat(),
            txn.amount,
            txn.category,
            txn.description or "",
        ]
        self.worksheet.append_row(row)


def init_sheet_service() -> None:
    global _sheet_service
    if not os.environ.get("GOOGLE_SHEETS_ID"):
        logger.info("GOOGLE_SHEETS_ID not set, sheet sync disabled")
        return
    try:
        _sheet_service = SheetService()
        logger.info("Sheet service initialized")
    except Exception as e:
        logger.warning("Could not initialize sheet service: %s", e)


def get_sheet_service() -> Optional[SheetService]:
    return _sheet_service
