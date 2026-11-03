import { AlertTriangle, RefreshCw } from "@/components/icons";
import { Button } from "@/components/Button";
import { Card, CardTitle } from "@/components/ui/Card";

export function WidgetUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-neutral-300 px-3 py-3 text-sm text-neutral-500 dark:border-brand-700 dark:text-neutral-400">
      <span className="flex min-w-0 items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        Not available yet
      </span>
      <Button type="button" variant="ghost" size="sm" onClick={onRetry} className="shrink-0">
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Retry
      </Button>
    </div>
  );
}

export function DashboardPanel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`min-w-0 rounded-2xl border-neutral-200 bg-white p-4 shadow-sm dark:border-brand-800 dark:bg-brand-900 sm:p-5 ${className}`}>
      <div className="mb-4">
        <CardTitle className="text-base text-neutral-950 dark:text-white">{title}</CardTitle>
        {subtitle && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
      </div>
      {children}
    </Card>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold tracking-tight text-neutral-950 dark:text-white">{children}</h2>;
}
