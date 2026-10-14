"use client";

import { useFormContext, useWatch, type FieldArrayWithId } from "react-hook-form";
import { X } from "@/components/icons";
import { computeBillTotals, computeItemTotal, type FreightBillFormValues } from "@/lib/bill/validations";
import type { ChargeDefinition } from "@/lib/charges";

interface BillItemsTableProps {
  /** Passed down from the page's single useFieldArray("items") instance — do NOT
   *  create a second useFieldArray on the same field name here; that's what
   *  caused rows to desync between this table and the CNS chip list. */
  fields: FieldArrayWithId<FreightBillFormValues, "items", "id">[];
  onRemove: (index: number) => void;
  chargeDefinitions: ChargeDefinition[];
}

export function BillItemsTable({ fields, onRemove, chargeDefinitions }: BillItemsTableProps) {
  const { control, register } = useFormContext<FreightBillFormValues>();
  const items = useWatch({ control, name: "items" }) ?? [];
  const totals = computeBillTotals(items);

  return (
    <table className="w-full border-collapse text-[11px]">
      <thead>
        <tr className="bg-slate-100 text-left">
          <th className="border border-slate-300 px-1 py-1">SR NO</th>
          <th className="border border-slate-300 px-1 py-1">Booking STN</th>
          <th className="border border-slate-300 px-1 py-1">To STN</th>
          <th className="border border-slate-300 px-1 py-1">CNS No</th>
          <th className="border border-slate-300 px-1 py-1">Date</th>
          {chargeDefinitions.map((definition) => (
            <th key={definition.id} className="border border-slate-300 px-1 py-1">{definition.name}</th>
          ))}
          <th className="border border-slate-300 px-1 py-1">Total Charges</th>
          <th className="border border-slate-300 px-1 py-1 print:hidden" />
        </tr>
      </thead>
      <tbody>
        {fields.map((field, index) => (
          <tr key={field.id}>
            <td className="border border-slate-300 px-1 py-1 text-center">{index + 1}</td>
            <td className="border border-slate-300 px-1 py-1">{field.bookingStn}</td>
            <td className="border border-slate-300 px-1 py-1">{field.toStn}</td>
            <td className="border border-slate-300 px-1 py-1 font-semibold">{field.cnsNo}</td>
            <td className="border border-slate-300 px-1 py-1">{field.date}</td>
            {chargeDefinitions.map((definition) => {
              const lineIndex = (items[index]?.chargeLines ?? []).findIndex((line) => line.chargeId === definition.id);
              return (
                <td key={definition.id} className="border border-slate-300 px-1 py-1">
                  {lineIndex >= 0 && (
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      {...register(`items.${index}.chargeLines.${lineIndex}.amount`)}
                      className="focus-ring w-full bg-transparent text-right"
                    />
                  )}
                </td>
              );
            })}
            <td className="border border-slate-300 px-1 py-1 text-right font-semibold">
              {computeItemTotal(items[index] ?? field).toFixed(2)}
            </td>
            <td className="border border-slate-300 px-1 py-1 text-center print:hidden">
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`Remove CNS ${field.cnsNo}`}
                className="focus-ring rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </td>
          </tr>
        ))}

        {fields.length === 0 && (
          <tr>
            <td colSpan={5 + chargeDefinitions.length + 2} className="border border-slate-300 px-2 py-4 text-center text-slate-400">
              No consignments added yet — search a CNS No. above to start the bill.
            </td>
          </tr>
        )}

        <tr className="bg-slate-100 font-semibold">
          <td className="border border-slate-300 px-1 py-1 text-right" colSpan={5}>Total</td>
          {chargeDefinitions.map((definition) => (
            <td key={definition.id} className="border border-slate-300 px-1 py-1 text-right">
              {items.reduce((sum, item) => {
                const line = item.chargeLines?.find((itemLine) => itemLine.chargeId === definition.id);
                return sum + Number(line?.amount ?? (definition.legacyBillField ? Reflect.get(item, definition.legacyBillField) : 0) ?? 0);
              }, 0).toFixed(2)}
            </td>
          ))}
          <td className="border border-slate-300 px-1 py-1 text-right">{totals.totalCharges.toFixed(2)}</td>
          <td className="border border-slate-300 px-1 py-1 print:hidden" />
        </tr>
      </tbody>
    </table>
  );
}