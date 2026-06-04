from pydantic import BaseModel


class CategoryItem(BaseModel):
    label: str
    emoji: str


class CategoriesResponse(BaseModel):
    income: list[CategoryItem]
    expense: list[CategoryItem]
