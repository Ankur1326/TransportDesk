"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/Badge";
import { getApiErrorMessage } from "@/lib/api/consignments";
import { createLorryHire, updateLorryHire, type LorryHireRecord } from "@/lib/lorry-hire/api";
import { lorryHireFormSchema, type LorryHireFormValues } from "@/lib/lorry-hire/validations";
import { LhcDetailsSection, PartySection, RouteSection } from "./RouteAndParty";
import { CargoSection, TruckSection } from "./TruckAndCargo";
import { FreightSection, NotesSection, PaymentsSection } from "./FreightAndPayments";
import { SettlementCard } from "./SettlementCard";
import { LorryHireActionsBar } from "./LorryHireActionsBar";
import { LorryHirePreview } from "./LorryHirePreview";
import { lorryHirePdfPath, openLorryHirePdf, openPdfTab } from "@/lib/lorry-hire/pdf-url";

const STATUS_VARIANT = { Hired: "info", "In Transit": "warning", Delivered: "success", Cancelled: "error" } as const;

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
      <form onSubmit={onSave} noValidate className="w-full space-y-4 pb-24">
        {cancelled && (
          <p className="border border-error-200 bg-error-50 px-3 py-2 text-body-sm text-error-700">
            This contract is cancelled{record?.cancelReason ? ` (${record.cancelReason})` : ""} and can&apos;t be edited.
          </p>
        )}

        <SettlementCard paidSoFar={record?.settlement.totalPaid} />

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
