import Skeleton from "react-loading-skeleton";

export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard" className="space-y-5">
      <div className="grid grid-cols-2 gap-3 border-b border-neutral-200 pb-4 sm:grid-cols-4 dark:border-brand-800">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2 py-2">
            <Skeleton width={90} height={12} />
            <Skeleton width={140} height={24} />
            <Skeleton width={110} height={12} />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="lg:col-span-8" height={260} />
        <Skeleton className="lg:col-span-4" height={260} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton height={270} />
        <Skeleton height={270} />
      </div>
      <Skeleton height={230} />
    </div>
  );
}
