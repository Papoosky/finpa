from typing import TypedDict


class Category(TypedDict):
    label: str
    emoji: str


INCOME_CATEGORIES: list[Category] = [
    {"label": "Salario", "emoji": "💰"},
    {"label": "Freelance", "emoji": "💻"},
    {"label": "Inversiones", "emoji": "📈"},
    {"label": "Regalo", "emoji": "🎁"},
    {"label": "Reembolso", "emoji": "🔄"},
    {"label": "Otro", "emoji": "📌"},
]

EXPENSE_CATEGORIES: list[Category] = [
    {"label": "Comida", "emoji": "🍔"},
    {"label": "Transporte", "emoji": "🚗"},
    {"label": "Inversiones", "emoji": "📈"},
    {"label": "Cuentas", "emoji": "📄"},
    {"label": "Salud", "emoji": "🏥"},
    {"label": "Entretenimiento", "emoji": "🎬"},
    {"label": "Bienestar", "emoji": "🧘"},
    {"label": "Ropa", "emoji": "👕"},
    {"label": "Educacion", "emoji": "📚"},
    {"label": "Suscripciones", "emoji": "📱"},
    {"label": "Mascota", "emoji": "🐾"},
    {"label": "Otro", "emoji": "📌"},
]
