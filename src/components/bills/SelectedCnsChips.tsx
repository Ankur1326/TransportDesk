import { FieldArrayWithId } from "react-hook-form";
import { X } from "@/components/icons";
import type { FreightBillFormValues } from "@/lib/bill/validations";

interface SelectedCnsChipsProps {
  /** Same fields array/remove fn as BillItemsTable — shared from the page's
   *  single useFieldArray("items") instance, not a separate one here. */
  fields: FieldArrayWithId<FreightBillFormValues, "items", "id">[];
  onRemove: (index: number) => void;
}

function SelectedCnsChips({ fields, onRemove }: SelectedCnsChipsProps) {
  if (fields?.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-1.5 print:hidden">
      {fields?.map((field, index) => (
        <span
          key={field.id}
          className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700"
        >
          #{index + 1} · LR {field.cnsNo}
          <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label={`Remove LR ${field.cnsNo}`}
            className="focus-ring rounded-full p-0.5 hover:bg-brand-100"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

export default SelectedCnsChips
