import Skeleton from "react-loading-skeleton";

export function PartyListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading customers" className="space-y-3 p-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton circle width={40} height={40} />
          <div className="flex-1">
            <Skeleton width="60%" />
            <Skeleton width="30%" height={10} />
          </div>
          <Skeleton width={60} />
        </div>
      ))}
    </div>
  );
}

export function LedgerSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading ledger" className="space-y-3 p-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton width={28} height={28} />
          <div className="flex-1">
            <Skeleton width="40%" />
            <Skeleton width="25%" height={10} />
          </div>
          <Skeleton width={70} />
        </div>
      ))}
    </div>
  );
}
