import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-text-on-accent hover:bg-accent-hover disabled:opacity-50",
  secondary: "bg-surface-alt text-text hover:bg-border disabled:opacity-50",
  outline: "border border-border text-text hover:bg-surface-alt disabled:opacity-50",
  ghost: "text-text hover:bg-surface-alt disabled:opacity-40",
  danger: "bg-error text-white hover:opacity-90 disabled:opacity-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  icon: "h-11 w-11 shrink-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", isLoading = false, disabled, className = "", children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`transition-base active:scale-[0.98] inline-flex items-center justify-center gap-2 rounded-lg font-medium disabled:cursor-not-allowed disabled:active:scale-100 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
});
