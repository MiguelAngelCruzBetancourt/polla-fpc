import { forwardRef } from "react";

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, id, className = "", ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-text">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        className={`transition-base min-h-11 rounded-lg border bg-surface px-3 text-base text-text placeholder:text-text-muted focus:outline-none focus:ring-1 ${
          error
            ? "border-error focus:border-error focus:ring-error"
            : "border-border focus:border-accent focus:ring-accent"
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-xs text-error">{error}</p>
      ) : (
        hint && <p className="text-xs text-text-muted">{hint}</p>
      )}
    </div>
  );
});
