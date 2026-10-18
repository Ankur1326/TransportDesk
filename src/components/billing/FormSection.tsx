import { Card } from "@/components/ui/Card";
import { CardLabel } from "@/components/ui/CardLabel";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Small action rendered on the right of the header, e.g. a toggle switch. */
  headerAction?: React.ReactNode;
}

export function FormSection({ title, description, children, className, headerAction }: FormSectionProps) {
  return (
    <Card
      padding="none"
      className={cn(
        "relative scroll-mt-20 overflow-hidden rounded-xl border-slate-200 shadow-sm",
        className
      )}
    >
      <CardLabel title={title} right={headerAction} />
      <div className="p-3">
        {description && (
          <p className="mb-3 text-xs leading-snug text-slate-500">{description}</p>
        )}
        {children}
      </div>
    </Card>
  );
}