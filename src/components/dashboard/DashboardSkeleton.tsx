import Skeleton from "react-loading-skeleton";

export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard" className="space-y-6">
      <div className="space-y-3">
        <Skeleton width={180} height={16} />
        <Skeleton width={220} height={32} />
        <Skeleton width="45%" height={14} />
        <div className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-brand-800 dark:bg-brand-900 sm:grid-cols-3">
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={40} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 7 }, (_, index) => <Skeleton key={index} height={128} borderRadius={16} />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-brand-800 dark:bg-brand-900">
            <Skeleton width="55%" height={18} />
            <Skeleton width="35%" height={30} />
            <Skeleton height={12} />
            <Skeleton count={4} height={24} />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} height={200} borderRadius={16} />)}
      </div>
    </div>
  );
}
