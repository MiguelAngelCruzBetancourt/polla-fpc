type BadgeVariant = "neutral" | "success" | "warning" | "error" | "info" | "accent";

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-surface-alt text-text-muted",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  error: "bg-error-bg text-error",
  info: "bg-info-bg text-info",
  accent: "bg-accent-subtle text-accent",
};

export function Badge({
  variant = "neutral",
  icon,
  className = "",
  children,
}: {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
