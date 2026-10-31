"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useFormContext, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { Check } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { getApiErrorMessage } from "@/lib/api/consignments";
import { createLorryHire, updateLorryHire, type LorryHireRecord } from "@/lib/lorry-hire/api";
import { lorryHireFormSchema, type LorryHireFormValues } from "@/lib/lorry-hire/validations";
import { cn } from "@/lib/utils";
import { LhcDetailsSection, PartySection, RouteSection } from "./RouteAndParty";
import { CargoSection, TruckSection } from "./TruckAndCargo";
import { FreightSection, NotesSection, PaymentsSection } from "./FreightAndPayments";
import { SettlementCard } from "./SettlementCard";
import { LorryHireActionsBar } from "./LorryHireActionsBar";
import { LorryHirePreview } from "./LorryHirePreview";
import { lorryHirePdfPath, openLorryHirePdf, openPdfTab } from "@/lib/lorry-hire/pdf-url";

const STATUS_VARIANT = { Hired: "info", "In Transit": "warning", Delivered: "success", Cancelled: "error" } as const;

/** Left rail: jump links with a tick once a section has what it needs. */
function SectionRail({ paymentsCount }: { paymentsCount: number }) {
  const { control } = useFormContext();
  const v = useWatch({ control }) as LorryHireFormValues;
  const sections = [
    { id: "details", label: "LHC details", done: !!(v.lhcNo && v.lhcDate) },
    { id: "route", label: "Route", done: !!(v.from?.location && v.to?.location) },
    { id: "party", label: "Supplier & owner", done: !!v.supplier?.name },
    { id: "truck", label: "Truck & driver", done: !!v.truck?.vehicleNumber },
    { id: "cargo", label: "Cargo", done: (v.items?.length ?? 0) > 0 },
    { id: "freight", label: "Freight & tax", done: (v.freight?.rate ?? 0) > 0 },
    { id: "payments", label: "Payments", done: paymentsCount > 0 },
    { id: "notes", label: "Remarks & sign", done: !!(v.remarks || v.driverSignature) },
  ];
  return (
    <nav aria-label="Form sections" className="sticky top-16 hidden space-y-1 xl:block">
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
  const [previewOpen, setPreviewOpen] = useState(false);

  /** Saves the contract. `tab` is a pre-opened tab that should land on its PDF. */
  const save = async (values: LorryHireFormValues, tab: Window | null) => {
    setBusy(true);
    try {
      let saved: LorryHireRecord;
      if (mode === "edit" && record) {
        // Payments are managed through their own API, never through this form.
        saved = await updateLorryHire(record._id, { ...values, payments: [] });
        toast.success(`${values.lhcNo} updated.`);
      } else {
        saved = await createLorryHire(values);
        toast.success(`${values.lhcNo} created.`);
      }
      if (tab) tab.location.href = lorryHirePdfPath(saved._id);
      router.push("/admin/lorry-hires");
    } catch (e) {
      tab?.close();
      toast.error(getApiErrorMessage(e, "Couldn't save the contract."));
    } finally {
      setBusy(false);
    }
  };

  const onInvalid = () => {
    toast.error("Please fix the highlighted fields.");
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const onSave = methods.handleSubmit((values) => save(values, null), onInvalid);

  // The tab opens inside the click (popup blockers), then waits for the save.
  const onSaveAndPrint = () => {
    const tab = openPdfTab();
    void methods.handleSubmit(
      (values) => save(values, tab),
      () => {
        tab?.close();
        onInvalid();
      }
    )();
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSave} noValidate className="mx-auto w-full max-w-7xl pb-6">
        {cancelled && (
          <p className="mb-4 border border-error-200 bg-error-50 px-3 py-2 text-body-sm text-error-700">
            This contract is cancelled{record?.cancelReason ? ` (${record.cancelReason})` : ""} and can&apos;t be edited.
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px] xl:grid-cols-[170px_1fr_320px]">
          <SectionRail paymentsCount={record ? record.payments.length : formPayments.length} />

          <fieldset disabled={cancelled} className="min-w-0 space-y-4">
            <LhcDetailsSection status={record && <Badge variant={STATUS_VARIANT[record.status]}>{record.status}</Badge>} />
            <RouteSection />
            <PartySection />
            <TruckSection />
            <CargoSection />
            <FreightSection />
            <PaymentsSection record={record} onRecordChange={setRecord} />
            <NotesSection />
          </fieldset>

          <div className="hidden lg:block">
            <div className="sticky top-16">
              <SettlementCard paidSoFar={record?.settlement.totalPaid} />
            </div>
          </div>
        </div>

        <LorryHireActionsBar
          mode={mode}
          busy={busy}
          canSave={!cancelled}
          paid={record?.settlement.totalPaid}
          onPreview={() => setPreviewOpen(true)}
          onSave={onSave}
          onSaveAndPrint={onSaveAndPrint}
          onPrintSaved={() => record && openLorryHirePdf(record)}
        />
      </form>

      {previewOpen && <LorryHirePreview record={record} onClose={() => setPreviewOpen(false)} />}
    </FormProvider>
  );
}
