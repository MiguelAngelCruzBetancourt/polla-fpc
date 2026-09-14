const PALETTE = [
  { bg: "var(--color-accent-subtle)", fg: "var(--color-accent)" },
  { bg: "var(--color-success-bg)", fg: "var(--color-success)" },
  { bg: "var(--color-info-bg)", fg: "var(--color-info)" },
  { bg: "var(--color-warning-bg)", fg: "var(--color-warning)" },
];

export type AvatarSize = "sm" | "md" | "lg";

// La caja va aparte del texto y se comparte con TeamCrest: es lo que garantiza
// que el escudo real y el avatar de iniciales ocupen exactamente el mismo
// espacio, sin depender de que dos constantes separadas coincidan por
// casualidad. El tamaño de letra solo aplica al avatar (un <img> no lo usa).
export const SIZE_BOX: Record<AvatarSize, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-12 w-12",
};

const SIZE_TEXT: Record<AvatarSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

/** Lado en px de cada tamaño, para los atributos width/height de <Image>. */
export const SIZE_PX: Record<AvatarSize, number> = { sm: 28, md: 36, lg: 48 };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function Avatar({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: AvatarSize;
  className?: string;
}) {
  const colors = PALETTE[hashName(name) % PALETTE.length]!;
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: colors.bg, color: colors.fg }}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${SIZE_BOX[size]} ${SIZE_TEXT[size]} ${className}`}
    >
      {initials(name)}
    </span>
  );
}
