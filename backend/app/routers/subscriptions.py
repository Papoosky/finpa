import calendar
import datetime
import logging
import uuid as _uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.subscription import Subscription
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionResponse,
    SubscriptionUpdate,
)
from app.schemas.transaction import TransactionResponse
from app.services.exchange_rate import get_usd_to_clp

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


# ── helpers ──────────────────────────────────────────────────────────────────


def _effective_day(billing_day: int, year: int, month: int) -> int:
    """Clamp billing_day to the last valid day of the given month."""
    return min(billing_day, calendar.monthrange(year, month)[1])


def _should_charge(subscription: Subscription, today: datetime.date) -> bool:
    """Return True if the subscription is due and has not been charged yet this period."""
    if subscription.start_date > today:
        return False

    last = subscription.last_charged_date
    eff = _effective_day(subscription.billing_day, today.year, today.month)

    if subscription.interval == "monthly":
        if today.day < eff:
            return False
        # Already charged this month?
        return not (last and last.year == today.year and last.month == today.month)

    # yearly
    billing_month = subscription.start_date.month
    if today.month != billing_month:
        return False
    if today.day < eff:
        return False
    # Already charged this year?
    return not (last and last.year == today.year)


async def _get_user_subscription(
    uuid: _uuid.UUID, user: User, db: AsyncSession
) -> Subscription:
    result = await db.execute(
        select(Subscription).where(
            Subscription.uuid == uuid,
            Subscription.user_id == user.id,
            Subscription.is_active.is_(True),
        )
    )
    sub = result.scalar_one_or_none()
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Suscripcion no encontrada"
        )
    return sub


# ── CRUD endpoints ────────────────────────────────────────────────────────────


@router.post(
    "/", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED
)
@limiter.limit("30/minute")
async def create_subscription(
    request: Request,
    body: SubscriptionCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Subscription:
    sub = Subscription(
        user_id=current_user.id,
        name=body.name,
        service_key=body.service_key,
        amount=body.amount,
        currency=body.currency,
        interval=body.interval,
        billing_day=body.billing_day,
        start_date=body.start_date,
        description=body.description,
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return sub


@router.get("/", response_model=list[SubscriptionResponse])
@limiter.limit("60/minute")
async def list_subscriptions(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Subscription]:
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.is_active.is_(True),
        )
    )
    return list(result.scalars().all())


@router.patch("/{subscription_uuid}", response_model=SubscriptionResponse)
@limiter.limit("30/minute")
async def update_subscription(
    request: Request,
    subscription_uuid: _uuid.UUID,
    body: SubscriptionUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Subscription:
    sub = await _get_user_subscription(subscription_uuid, current_user, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(sub, field, value)
    await db.commit()
    await db.refresh(sub)
    return sub


@router.delete("/{subscription_uuid}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute")
async def delete_subscription(
    request: Request,
    subscription_uuid: _uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    sub = await _get_user_subscription(subscription_uuid, current_user, db)
    sub.is_active = False
    await db.commit()


# ── process-due ───────────────────────────────────────────────────────────────


@router.post("/process-due", response_model=list[TransactionResponse])
@limiter.limit("60/minute")
async def process_due_subscriptions(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Transaction]:
    """Check all active subscriptions and create expense transactions for those due today.

    Idempotent: calling multiple times on the same day is safe.
    USD subscriptions use the current USD/CLP rate from mindicador.cl.
    """
    today = datetime.datetime.now(tz=datetime.UTC).date()

    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.is_active.is_(True),
        )
    )
    subscriptions = list(result.scalars().all())

    # Fetch rate once if any USD subscription is due
    usd_rate: float | None = None
    needs_rate = any(
        s.currency == "USD" and _should_charge(s, today) for s in subscriptions
    )
    if needs_rate:
        try:
            usd_rate = await get_usd_to_clp()
        except RuntimeError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(exc),
            ) from exc

    created: list[Transaction] = []

    for sub in subscriptions:
        if not _should_charge(sub, today):
            continue

        if sub.currency == "USD":
            rate = usd_rate or 1.0
            clp_amount = round(float(sub.amount) * rate)
            description = (
                f"{sub.name} (USD {sub.amount:.2f} x ${rate:,.2f} = ${clp_amount:,})"
            )
        else:
            clp_amount = float(sub.amount)
            description = sub.name

        tx = Transaction(
            user_id=current_user.id,
            type="expense",
            amount=clp_amount,
            date=today,
            category="Suscripciones",
            description=description,
            subscription_uuid=sub.uuid,
        )
        db.add(tx)
        sub.last_charged_date = today
        created.append(tx)
        logger.info(
            "Auto-charged subscription %s for user %s: $%s CLP",
            sub.uuid,
            current_user.uuid,
            clp_amount,
        )

    if created:
        await db.commit()
        for tx in created:
            await db.refresh(tx)

    return created
