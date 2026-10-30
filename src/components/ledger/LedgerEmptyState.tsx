import { FileText, Users } from "@/components/icons";
import { EmptyState } from "@/components/ui/EmptyState";

export function NoCustomerSelected() {
  return (
    <EmptyState
      icon={<Users className="h-8 w-8" />}
      title="Select a customer"
      description="Pick a customer from the list to see their ledger."
      className="h-full"
    />
  );
}

export function NoLedgerEntries({ filtered }: { filtered: boolean }) {
  return (
    <EmptyState
      icon={<FileText className="h-8 w-8" />}
      title="No entries yet"
      description={filtered ? "No entries match these filters." : "Bills and payments for this customer will appear here."}
    />
  );
}
