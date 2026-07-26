const PALETTE = [
  { bg: "var(--color-accent-subtle)", fg: "var(--color-accent)" },
  { bg: "var(--color-success-bg)", fg: "var(--color-success)" },
  { bg: "var(--color-info-bg)", fg: "var(--color-info)" },
  { bg: "var(--color-warning-bg)", fg: "var(--color-warning)" },
];

const SIZE_CLASSES = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

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
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const colors = PALETTE[hashName(name) % PALETTE.length]!;
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: colors.bg, color: colors.fg }}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${SIZE_CLASSES[size]} ${className}`}
    >
      {initials(name)}
    </span>
  );
}
