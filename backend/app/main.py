from fastapi import FastAPI
from app.models.transaction import TransactionCreate, TransactionResponse
from app.services.sheet_service import SheetService

app = FastAPI(title="Finpa API", description="API para registrar transacciones hacia Google Sheets")
sheet_service = SheetService()

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Finpa API is running"}

@app.post("/transactions/", response_model=TransactionResponse, status_code=201)
def create_transaction(transaction: TransactionCreate):
    # En el futuro esto llamara la sheet real, por ahora esta mockeado
    result = sheet_service.add_transaction(transaction)
    return result
