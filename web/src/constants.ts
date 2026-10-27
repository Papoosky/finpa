export type Category = { label: string; emoji: string };

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
  { label: "Bienestar", emoji: "🧘" },
  { label: "Ropa", emoji: "👕" },
  { label: "Educacion", emoji: "📚" },
  { label: "Suscripciones", emoji: "📱" },
  { label: "Mascota", emoji: "🐾" },
  { label: "Otro", emoji: "📌" },
];

export const CATEGORY_EMOJI = Object.fromEntries(
  [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].map((category) => [
    category.label,
    category.emoji,
  ]),
);

export const SERVICES = [
  { key: "claude", name: "Claude", color: "#D97706", initials: "CL" },
  { key: "chatgpt", name: "ChatGPT", color: "#10A37F", initials: "GP" },
  { key: "netflix", name: "Netflix", color: "#E50914", initials: "NF" },
  { key: "spotify", name: "Spotify", color: "#1DB954", initials: "SP" },
  { key: "youtube", name: "YouTube Premium", color: "#CC0000", initials: "YT" },
  { key: "disney", name: "Disney+", color: "#113CCF", initials: "D+" },
  { key: "amazon", name: "Amazon Prime", color: "#00A8E8", initials: "PR" },
  { key: "appletv", name: "Apple TV+", color: "#555555", initials: "TV" },
  { key: "applemusic", name: "Apple Music", color: "#FC3C44", initials: "AM" },
  { key: "icloud", name: "iCloud+", color: "#3693DF", initials: "iC" },
  { key: "github", name: "GitHub Copilot", color: "#24292E", initials: "GH" },
  {
    key: "microsoft365",
    name: "Microsoft 365",
    color: "#D83B01",
    initials: "M3",
  },
  { key: "googleone", name: "Google One", color: "#4285F4", initials: "G1" },
  { key: "adobe", name: "Adobe CC", color: "#FF0000", initials: "AD" },
  { key: "notion", name: "Notion", color: "#000000", initials: "NT" },
  { key: "figma", name: "Figma", color: "#F24E1E", initials: "FG" },
] as const;

export const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
