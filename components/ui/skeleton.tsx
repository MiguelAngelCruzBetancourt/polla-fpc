export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
