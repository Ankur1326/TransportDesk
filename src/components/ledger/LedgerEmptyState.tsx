import { FileText, Users } from "@/components/icons";

function Empty({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-(--ledger-accent-soft) text-(--ledger-edge)" aria-hidden="true">
        {icon}
      </span>
      <h3 className="mt-1 text-base font-semibold text-neutral-900 dark:text-neutral-50">{title}</h3>
      <p className="max-w-xs text-sm text-neutral-500">{description}</p>
      {action}
    </div>
  );
}

export function NoCustomerSelected({ noun = "customer", docs = "bills" }: { noun?: string; docs?: string }) {
  return (
    <Empty
      icon={<Users size={26} />}
      title={`Select a ${noun}`}
      description={`Choose someone from the list to see their ${docs}, payments and balance.`}
    />
  );
}

export function NoLedgerEntries({ filtered, onClear }: { filtered: boolean; onClear?: () => void }) {
  return (
    <Empty
      icon={<FileText size={26} />}
      title="No entries yet"
      description={filtered ? "Nothing matches these filters." : "Bills, contracts and payments will appear here."}
      action={
        filtered && onClear ? (
          <button type="button" onClick={onClear} className="mt-2 text-sm font-medium text-(--ledger-edge) hover:underline">
            Clear filters
          </button>
        ) : undefined
      }
    />
  );
}
