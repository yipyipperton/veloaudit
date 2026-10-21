export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-10" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="surface p-6"><Skeleton className="h-5 w-72" /><Skeleton className="mt-3 h-3 w-96 max-w-full" /><Skeleton className="mt-6 h-24 w-24 rounded-full" /></div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((k) => <div key={k} className="surface grid grid-cols-3 gap-3 p-6">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>)}
      </div>
    </div>
  );
}
