import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)
from app.services.sheet_service import get_sheet_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("/", response_model=TransactionResponse, status_code=201)
async def create_transaction(
    body: TransactionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    txn = Transaction(
        user_id=user.id,
        type=body.type,
        amount=body.amount,
        date=body.date,
        category=body.category,
        description=body.description,
    )
    db.add(txn)
    await db.commit()
    await db.refresh(txn)

    if user.sync_to_sheets:
        sheet = get_sheet_service()
        if sheet:
            sheet.add_transaction(txn)

    return txn


@router.get("/", response_model=list[TransactionResponse])
async def list_transactions(
    type: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    date_from: Optional[datetime.date] = Query(None),
    date_to: Optional[datetime.date] = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Transaction).where(Transaction.user_id == user.id)
    if type:
        stmt = stmt.where(Transaction.type == type)
    if category:
        stmt = stmt.where(Transaction.category == category)
    if date_from:
        stmt = stmt.where(Transaction.date >= date_from)
    if date_to:
        stmt = stmt.where(Transaction.date <= date_to)
    stmt = stmt.order_by(Transaction.date.desc())

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{transaction_uuid}", response_model=TransactionResponse)
async def get_transaction(
    transaction_uuid: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    txn = await _get_user_transaction(db, transaction_uuid, user.id)
    return txn


@router.patch("/{transaction_uuid}", response_model=TransactionResponse)
async def update_transaction(
    transaction_uuid: UUID,
    body: TransactionUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    txn = await _get_user_transaction(db, transaction_uuid, user.id)

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(txn, field, value)

    await db.commit()
    await db.refresh(txn)
    return txn


@router.delete("/{transaction_uuid}", status_code=204)
async def delete_transaction(
    transaction_uuid: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    txn = await _get_user_transaction(db, transaction_uuid, user.id)
    await db.delete(txn)
    await db.commit()


async def _get_user_transaction(
    db: AsyncSession, transaction_uuid: UUID, user_id: int
) -> Transaction:
    result = await db.execute(
        select(Transaction).where(
            Transaction.uuid == transaction_uuid,
            Transaction.user_id == user_id,
        )
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaccion no encontrada")
    return txn
