// components/bills/PrintItemsTable.tsx
"use client";

import { computeBillTotals, computeItemTotal, type BillItemValues } from "@/lib/bill/validations";
import formatDate from "@/lib/formateDate";
import type { ChargeDefinition } from "@/lib/charges";

export function PrintItemsTable({ items, chargeDefinitions }: { items: BillItemValues[]; chargeDefinitions: ChargeDefinition[] }) {
  const totals = computeBillTotals(items);
  const columnCount = 5 + chargeDefinitions.length + 1;

  return (
    <table className="w-full border-collapse border-x border-slate-900 text-[11px]">
      <thead className="">
        <tr className="bg-slate-100 text-left">
          <th className="border-t border-slate-300 px-1 py-1">SR NO</th>
          <th className="border border-slate-300 px-1 py-1">Booking STN</th>
          <th className="border border-slate-300 px-1 py-1">To STN</th>
          <th className="border border-slate-300 px-1 py-1">CNS No</th>
          <th className="border border-slate-300 px-1 py-1">Date</th>
          {chargeDefinitions.map((definition) => (
            <th key={definition.id} className="border border-slate-300 px-1 py-1">{definition.name}</th>
          ))}
          <th className="border-y border-slate-300 px-1 py-1">Total Charges</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 && (
          <tr>
            <td colSpan={columnCount} className="border border-slate-300 px-2 py-4 text-center text-slate-400">
              No consignments added.
            </td>
          </tr>
        )}
        {items.map((item, index) => (
          <tr key={item.consignmentId ?? index}>
            <td className="border-t border-slate-300 px-1 py-1 text-center">{index + 1}</td>
            <td className="border border-slate-300 px-1 py-1">{item.bookingStn}</td>
            <td className="border border-slate-300 px-1 py-1">{item.toStn}</td>
            <td className="border border-slate-300 px-1 py-1 font-semibold">{item.cnsNo}</td>
            <td className="border-t border-slate-300 px-1 py-1">{formatDate(item.date)}</td>
            {chargeDefinitions.map((definition) => (
              <td key={definition.id} className="border border-slate-300 px-1 py-1 text-right">
                {Number(item.chargeLines?.find((line) => line.chargeId === definition.id)?.amount ??
                  (definition.legacyBillField ? Reflect.get(item, definition.legacyBillField) : 0) ?? 0).toFixed(2)}
              </td>
            ))}
            <td className="border-y border-slate-300 px-1 py-1 text-right font-semibold">
              {computeItemTotal(item).toFixed(2)}
            </td>
          </tr>
        ))}
        <tr className="bg-slate-100 font-semibold">
          <td className="border-y border-slate-300 px-1 py-1 text-right" colSpan={5}>Total</td>
          {chargeDefinitions.map((definition) => (
            <td key={definition.id} className="border border-slate-300 px-1 py-1 text-right">
              {items.reduce((sum, item) => sum + Number(item.chargeLines?.find((line) => line.chargeId === definition.id)?.amount ??
                (definition.legacyBillField ? Reflect.get(item, definition.legacyBillField) : 0) ?? 0), 0).toFixed(2)}
            </td>
          ))}
          <td className="border-y border-slate-300 px-1 py-1 text-right">{totals.totalCharges.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  );
}