"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useFormContext, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { Button } from "@/components/Button";
import { ArrowLeft, Check } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { getApiErrorMessage } from "@/lib/api/consignments";
import { createLorryHire, updateLorryHire, type LorryHireRecord } from "@/lib/lorry-hire/api";
import { lorryHireFormSchema, type LorryHireFormValues } from "@/lib/lorry-hire/validations";
import { cn } from "@/lib/utils";
import { PartySection, RouteSection } from "./RouteAndParty";
import { CargoSection, TruckSection } from "./TruckAndCargo";
import { FreightSection, NotesSection, PaymentsSection } from "./FreightAndPayments";
import { SettlementCard, useLorryHireSummary } from "./SettlementCard";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_VARIANT = { Hired: "info", "In Transit": "warning", Delivered: "success", Cancelled: "error" } as const;

/** Left rail: jump links with a tick once a section has what it needs. */
function SectionRail({ paymentsCount }: { paymentsCount: number }) {
  const { control } = useFormContext();
  const v = useWatch({ control }) as LorryHireFormValues;
  const sections = [
    { id: "route", label: "Route & dates", done: !!(v.from?.location && v.to?.location) },
    { id: "party", label: "Supplier & owner", done: !!v.supplier?.name },
    { id: "truck", label: "Truck & driver", done: !!v.truck?.vehicleNumber },
    { id: "cargo", label: "Cargo", done: (v.items?.length ?? 0) > 0 },
    { id: "freight", label: "Freight & tax", done: (v.freight?.rate ?? 0) > 0 },
    { id: "payments", label: "Payments", done: paymentsCount > 0 },
    { id: "notes", label: "Remarks & sign", done: !!(v.remarks || v.driverSignature) },
  ];
  return (
    <nav aria-label="Form sections" className="sticky top-28 hidden space-y-1 xl:block">
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className="flex items-center gap-2 px-2 py-1.5 text-body-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
        >
          <span className={cn("flex h-4 w-4 items-center justify-center rounded-full border", s.done ? "border-success-600 bg-success-600 text-white" : "border-neutral-300")}>
            {s.done && <Check className="h-3 w-3" aria-hidden="true" />}
          </span>
          {s.label}
        </a>
      ))}
    </nav>
  );
}

function MobileBar({ paid, busy, canSave }: { paid?: number; busy: boolean; canSave: boolean }) {
  const { s } = useLorryHireSummary(paid);
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-neutral-200 bg-white px-4 py-2 lg:hidden">
      <div className="text-body-sm">
        <p className="text-caption text-neutral-500">Net {inr(s.netPayable)}</p>
        <p className={cn("font-semibold tabular-nums", s.balance > 0 ? "text-error-700" : "text-success-700")}>Balance {inr(s.balance)}</p>
      </div>
      {canSave && <Button type="submit" isLoading={busy}>Save</Button>}
    </div>
  );
}

export function LorryHireForm({
  mode,
  initialValues,
  record: initialRecord,
}: {
  mode: "create" | "edit";
  initialValues: LorryHireFormValues;
  record?: LorryHireRecord;
}) {
  const router = useRouter();
  const [record, setRecord] = useState(initialRecord);
  const [busy, setBusy] = useState(false);

  const methods = useForm<LorryHireFormValues>({
    resolver: zodResolver(lorryHireFormSchema),
    defaultValues: initialValues,
    mode: "onBlur",
  });
  const formPayments = useWatch({ control: methods.control, name: "payments" }) ?? [];

  const cancelled = record?.status === "Cancelled";

  const onValid = async (values: LorryHireFormValues) => {
    setBusy(true);
    try {
      if (mode === "edit" && record) {
        // Payments are managed through their own API, never through this form.
        await updateLorryHire(record._id, { ...values, payments: [] });
        toast.success(`${values.lhcNo} updated.`);
      } else {
        await createLorryHire(values);
        toast.success(`${values.lhcNo} created.`);
      }
      router.push("/admin/lorry-hires");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Couldn't save the contract."));
    } finally {
      setBusy(false);
    }
  };

  const onInvalid = () => {
    toast.error("Please fix the highlighted fields.");
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onValid, onInvalid)} noValidate className="mx-auto w-full max-w-7xl pb-24 lg:pb-8">
        {/* Header */}
        <div className="sticky top-0 z-20 -mx-1 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white/95 px-1 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <Link href="/admin/lorry-hires" aria-label="Back to contracts" className="text-neutral-500 hover:text-neutral-900">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="text-h4 font-semibold text-neutral-900">
                {mode === "edit" ? `Edit ${record?.lhcNo ?? ""}` : "New Lorry Hire Contract"}
              </h1>
              <p className="text-caption text-neutral-500">Hire a truck from a broker or owner.</p>
            </div>
            {record && <Badge variant={STATUS_VARIANT[record.status]}>{record.status}</Badge>}
          </div>
          <div className="hidden gap-2 lg:flex">
            <Link href="/admin/lorry-hires"><Button type="button" variant="outline">Cancel</Button></Link>
            {!cancelled && <Button type="submit" isLoading={busy}>{mode === "edit" ? "Save changes" : "Create contract"}</Button>}
          </div>
        </div>

        {cancelled && (
          <p className="mb-4 border border-error-200 bg-error-50 px-3 py-2 text-body-sm text-error-700">
            This contract is cancelled{record?.cancelReason ? ` (${record.cancelReason})` : ""} and can&apos;t be edited.
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px] xl:grid-cols-[170px_1fr_320px]">
          <SectionRail paymentsCount={record ? record.payments.length : formPayments.length} />

          <fieldset disabled={cancelled} className="min-w-0 space-y-4">
            <RouteSection />
            <PartySection />
            <TruckSection />
            <CargoSection />
            <FreightSection />
            <PaymentsSection record={record} onRecordChange={setRecord} />
            <NotesSection />
          </fieldset>

          <div className="hidden lg:block">
            <div className="sticky top-28">
              <SettlementCard paidSoFar={record?.settlement.totalPaid} />
            </div>
          </div>
        </div>

        <MobileBar paid={record?.settlement.totalPaid} busy={busy} canSave={!cancelled} />
      </form>
    </FormProvider>
  );
}
