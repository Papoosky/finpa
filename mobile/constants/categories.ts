export type Category = {
  label: string;
  emoji: string;
};

export const INCOME_CATEGORIES: Category[] = [
  { label: "Salario", emoji: "💰" },
  { label: "Freelance", emoji: "💻" },
  { label: "Inversiones", emoji: "📈" },
  { label: "Regalo", emoji: "🎁" },
  { label: "Reembolso", emoji: "🔄" },
  { label: "Otro", emoji: "📌" },
];

export const EXPENSE_CATEGORIES: Category[] = [
  { label: "Comida", emoji: "🍔" },
  { label: "Transporte", emoji: "🚗" },
  { label: "Inversiones", emoji: "📈" },
  { label: "Cuentas", emoji: "📄" },
  { label: "Salud", emoji: "🏥" },
  { label: "Entretenimiento", emoji: "🎬" },
  { label: "Ropa", emoji: "👕" },
  { label: "Educacion", emoji: "📚" },
  { label: "Suscripciones", emoji: "📱" },
  { label: "Mascota", emoji: "🐾" },
  { label: "Otro", emoji: "📌" },
];

export const CATEGORY_EMOJI_MAP: Record<string, string> = Object.fromEntries(
  [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].map((c) => [c.label, c.emoji])
);
