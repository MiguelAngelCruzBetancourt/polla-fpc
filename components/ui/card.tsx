export function Card({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-center justify-between gap-3 p-4 sm:p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-4 pb-4 sm:px-5 sm:pb-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex items-center justify-end gap-2 border-t border-border px-4 py-3 sm:px-5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
