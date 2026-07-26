import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, id, className = "", children, ...props },
  ref,
) {
  const selectId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-sm font-medium text-text">
        {label}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={`transition-base min-h-11 w-full appearance-none rounded-lg border border-border bg-surface px-3 pr-9 text-base text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
      </div>
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
});
