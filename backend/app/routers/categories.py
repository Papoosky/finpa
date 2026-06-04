from fastapi import APIRouter, Depends

from app.auth import require_service_token
from app.constants.categories import EXPENSE_CATEGORIES, INCOME_CATEGORIES
from app.schemas.categories import CategoriesResponse, CategoryItem

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get(
    "",
    response_model=CategoriesResponse,
    dependencies=[Depends(require_service_token)],
)
async def list_categories() -> CategoriesResponse:
    return CategoriesResponse(
        income=[CategoryItem(**c) for c in INCOME_CATEGORIES],
        expense=[CategoryItem(**c) for c in EXPENSE_CATEGORIES],
    )
