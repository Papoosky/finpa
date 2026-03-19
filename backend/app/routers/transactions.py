import datetime
import uuid as _uuid
from uuid import UUID

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import (
    PaginatedTransactions,
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)
from app.services.sheet_service import get_sheet_service

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post(
    "/", response_model=TransactionResponse | list[TransactionResponse], status_code=201
)
@limiter.limit("60/minute")
async def create_transaction(
    request: Request,
    body: TransactionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.installments is None:
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

    # Installment creation
    n = body.installments
    group_id = _uuid.uuid4()
    base_amount = round(body.amount / n, 2)
    remainder = round(body.amount - base_amount * (n - 1), 2)

    transactions: list[Transaction] = []
    for i in range(n):
        txn_date = body.date + relativedelta(months=i)
        amount = remainder if i == n - 1 else base_amount
        txn = Transaction(
            user_id=user.id,
            type=body.type,
            amount=amount,
            date=txn_date,
            category=body.category,
            description=body.description,
            installment_total=n,
            installment_number=i + 1,
            installment_group=group_id,
        )
        db.add(txn)
        transactions.append(txn)

    await db.commit()
    for txn in transactions:
        await db.refresh(txn)

    if user.sync_to_sheets:
        sheet = get_sheet_service()
        if sheet:
            for txn in transactions:
                sheet.add_transaction(txn)

    return transactions


@router.get("/", response_model=PaginatedTransactions)
@limiter.limit("60/minute")
async def list_transactions(
    request: Request,
    type: str | None = Query(None),  # noqa: A002
    category: str | None = Query(None),
    date_from: datetime.date | None = Query(None),
    date_to: datetime.date | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base = select(Transaction).where(Transaction.user_id == user.id)
    if type:
        base = base.where(Transaction.type == type)
    if category:
        base = base.where(Transaction.category == category)
    if date_from:
        base = base.where(Transaction.date >= date_from)
    if date_to:
        base = base.where(Transaction.date <= date_to)

    # Count total matching rows
    count_stmt = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # Fetch paginated results
    stmt = base.order_by(Transaction.date.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)

    return PaginatedTransactions(
        items=result.scalars().all(),  # ty: ignore[invalid-argument-type]  # Sequence[Transaction] is compatible with list[TransactionResponse] via Pydantic
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/installment-group/{group_uuid}", response_model=list[TransactionResponse])
@limiter.limit("60/minute")
async def get_installment_group(
    request: Request,
    group_uuid: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Transaction)
        .where(
            Transaction.installment_group == group_uuid,
            Transaction.user_id == user.id,
        )
        .order_by(Transaction.installment_number)
    )
    result = await db.execute(stmt)
    txns = result.scalars().all()
    if not txns:
        raise HTTPException(status_code=404, detail="Grupo de cuotas no encontrado")
    return txns


@router.get("/{transaction_uuid}", response_model=TransactionResponse)
@limiter.limit("60/minute")
async def get_transaction(
    request: Request,
    transaction_uuid: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_user_transaction(db, transaction_uuid, user.id)


@router.patch("/{transaction_uuid}", response_model=TransactionResponse)
@limiter.limit("60/minute")
async def update_transaction(
    request: Request,
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
@limiter.limit("60/minute")
async def delete_transaction(
    request: Request,
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
