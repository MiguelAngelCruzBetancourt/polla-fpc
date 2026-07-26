import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type AlertVariant = "success" | "warning" | "error" | "info";

const VARIANT: Record<AlertVariant, { classes: string; icon: React.ReactNode }> = {
  success: { classes: "bg-success-bg text-success", icon: <CheckCircle2 size={18} /> },
  warning: { classes: "bg-warning-bg text-warning", icon: <AlertTriangle size={18} /> },
  error: { classes: "bg-error-bg text-error", icon: <XCircle size={18} /> },
  info: { classes: "bg-info-bg text-info", icon: <Info size={18} /> },
};

export function Alert({
  variant = "info",
  children,
  className = "",
}: {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
}) {
  const { classes, icon } = VARIANT[variant];
  return (
    <div role="alert" className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${classes} ${className}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>{children}</div>
    </div>
  );
}
