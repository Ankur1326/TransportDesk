"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { ArrowDown, FilePlus2, X } from "@/components/icons";

import {
  createConsignment,
  getConsignment,
  getApiErrorMessage,
  updateConsignment,
} from "@/lib/api/consignments";
import { Loading } from "@/components/ui/Loading";

import { ConsignmentInfoSection } from "@/components/billing/ConsignmentInfoSection";
import { RouteSection } from "@/components/billing/RouteSection";
import { PartyCard } from "@/components/billing/PartyCard";
import { ShipmentDetailsSection } from "@/components/billing/Shipmentdetailssection";
import { LoadTypeSection } from "@/components/billing/Loadtypesection";
import { TransportDetailsSection } from "@/components/billing/Transportdetailssection";
import { ChargesSection } from "@/components/billing/Chargessection";
import { GstSection } from "@/components/billing/Gstsection";
import { BillingSummary } from "@/components/billing/Billingsummary";
import { PaymentSection } from "@/components/billing/Paymentsection";
import { InsuranceSection } from "@/components/billing/Insurancesection";
import { AdditionalInfoSection } from "@/components/billing/Additionalinfosection";
import { FormActionsBar } from "@/components/billing/Formactionsbar";
import { PrintPreview } from "@/components/billing/Printpreview";
import { WorkflowTabs } from "@/components/admin/WorkflowTabs";

import { billingFormSchema, buildDefaultValues, type BillingFormValues } from "@/lib/validations/billing";
import { fetchNextConsignmentNumber, generateConsignmentNumber, saveConsignmentNumber } from "@/lib/generateConsignmentNumber";
import { chargeLinesFromLegacy, DEFAULT_CHARGE_DEFINITIONS } from "@/lib/charges";
import type { ChargeDefinition } from "@/lib/charges";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const DRAFT_STORAGE_KEY = "uts:billing-draft:v1";
const AUTOSAVE_DEBOUNCE_MS = 1200;
const FORM_SECTIONS = [
  { id: "consignment-details", label: "LR details" },
  { id: "consignment-parties", label: "Parties" },
  { id: "consignment-route", label: "Route" },
  { id: "consignment-shipment", label: "Goods & vehicle" },
  { id: "consignment-billing", label: "Charges & payment" },
  { id: "consignment-additional", label: "Optional details" },
] as const;

function readDraft(): BillingFormValues | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BillingFormValues) : null;
  } catch {
    return null;
  }
}

function timeAgoLabel(date: Date | null): string {
  if (!date) return "";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 5) return "Draft saved just now";
  if (seconds < 60) return `Draft saved ${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `Draft saved ${minutes} min${minutes === 1 ? "" : "s"} ago`;
}

function TransportBillingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const { settings: companySettings, isLoading: isLoadingSettings } = useCompanySettings();

  const [draftBanner, setDraftBanner] = useState<BillingFormValues | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [, forceTick] = useState(0);
  const [recordId, setRecordId] = useState<string | null>(editId);
  const [isLoadingRecord, setIsLoadingRecord] = useState(Boolean(editId));
  const initialNumberRef = useRef(generateConsignmentNumber());

  const methods = useForm<BillingFormValues>({
    resolver: zodResolver(billingFormSchema),
    defaultValues: buildDefaultValues(initialNumberRef.current),
    mode: "onBlur",
  });

  const {
    handleSubmit,
    watch,
    reset,
    formState: { isDirty, isSubmitting },
  } = methods;

  // New consignment: the ref above is just an instant local placeholder — replace it
  // with the real next number from the database as soon as it resolves, but only if
  // the person hasn't already started editing the field themselves.
  useEffect(() => {
    if (editId) return;

    let cancelled = false;
    fetchNextConsignmentNumber().then((nextNumber) => {
      if (cancelled) return;
      const current = methods.getValues("consignmentNumber");
      if (current === initialNumberRef.current) {
        methods.setValue("consignmentNumber", nextNumber, { shouldDirty: false, shouldValidate: false });
        initialNumberRef.current = nextNumber;
      }
    });

    return () => {
      cancelled = true;
    };
    // Only ever run once on mount for a fresh consignment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // Editing an existing consignment: load it from the backend instead of a fresh draft.
  useEffect(() => {
    if (!editId || isLoadingSettings) return;

    let cancelled = false;
    setIsLoadingRecord(true);

    getConsignment(editId)
      .then((record) => {
        if (cancelled) return;
        const charges = record.charges as BillingFormValues["charges"];
        const legacyDefinitions = [
          ...companySettings.chargeDefinitions,
          ...DEFAULT_CHARGE_DEFINITIONS.filter((definition) =>
            !companySettings.chargeDefinitions.some((current) => current.id === definition.id)
          ),
        ];
        const chargeLines = Array.isArray(charges.chargeLines)
          ? charges.chargeLines
          : chargeLinesFromLegacy(
              charges,
              legacyDefinitions,
              "bilty"
            );
        reset({ ...record, charges: { ...charges, chargeLines } });
        setRecordId(record._id);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(getApiErrorMessage(error, "Couldn't load that consignment."));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRecord(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companySettings.chargeDefinitions, editId, isLoadingSettings, reset]);

  useEffect(() => {
    if (editId || isLoadingSettings) return;
    const currentLines = methods.getValues("charges.chargeLines");
    if (currentLines?.length) return;
    methods.setValue(
      "charges.chargeLines",
      companySettings.chargeDefinitions
        .filter((charge) => charge.includeOnBilty)
        .map((charge) => ({ chargeId: charge.id, name: charge.name, amount: charge.defaultAmount ?? 0 })),
      { shouldDirty: false }
    );
  }, [companySettings.chargeDefinitions, editId, isLoadingSettings, methods]);

  // Offer to restore an existing draft rather than silently overwriting it (new consignments only).
  useEffect(() => {
    if (editId) return;
    const existing = readDraft();
    if (existing) setDraftBanner(existing);
  }, [editId]);

  // Re-render the "Draft saved Xs ago" label periodically.
  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  // Autosave to localStorage, debounced.
  useEffect(() => {
    const subscription = watch((values) => {
      const handle = setTimeout(() => {
        try {
          window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(values));
          setLastSavedAt(new Date());
        } catch {
          // Storage may be unavailable (private browsing, quota) — fail silently, autosave is a convenience.
        }
      }, AUTOSAVE_DEBOUNCE_MS);
      return () => clearTimeout(handle);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // Local draft cache — kept as an offline-friendly fallback alongside the backend save.
  const cacheDraftLocally = (values: BillingFormValues) => {
    saveConsignmentNumber(values.consignmentNumber);
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(values));
    setLastSavedAt(new Date());
  };

  /** Creates the consignment on first save, updates it on every save after that. */
  const persistToBackend = async (values: BillingFormValues) => {
    if (recordId) {
      const updated = await updateConsignment(recordId, values);
      return updated;
    }
    const created = await createConsignment(values);
    setRecordId(created._id);
    router.replace(`/admin/consignment/new?id=${created._id}`);
    return created;
  };

  const onSaveDraft = handleSubmit(
    async (values) => {
      cacheDraftLocally(values);
      try {
        await persistToBackend(values);
        toast.success(`Draft saved — Consignment No: ${values.consignmentNumber}`);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Couldn't save the draft. It's cached locally — try again shortly."));
      }
    },
    () => toast.error("Please fix the highlighted fields before saving.")
  );

  const onSaveAndPrint = handleSubmit(
    async (values) => {
      cacheDraftLocally(values);
      try {
        await persistToBackend(values);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Couldn't save before printing. Showing the preview anyway."));
      }
      setPreviewOpen(true);
    },
    () => toast.error("Please fix the highlighted fields before printing.")
  );

  const onReset = async () => {
    const nextNumber = await fetchNextConsignmentNumber();
    const fresh = buildDefaultValues(nextNumber);
    initialNumberRef.current = nextNumber;
    reset(fresh);
    setRecordId(null);
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    if (editId) router.replace("/admin/consignment/new");
    toast.success("Form reset.");
  };

  const values = watch();
  const formChargeDefinitions: ChargeDefinition[] = (values.charges?.chargeLines ?? []).map((line) => {
    const configured = companySettings.chargeDefinitions.find((charge) => charge.id === line.chargeId);
    const legacy = DEFAULT_CHARGE_DEFINITIONS.find((charge) => charge.id === line.chargeId);
    return {
      id: line.chargeId,
      name: line.name,
      defaultAmount: configured?.defaultAmount ?? 0,
      includeOnBilty: true,
      includeOnBill: configured?.includeOnBill ?? false,
      ...(legacy?.legacyBiltyField ? { legacyBiltyField: legacy.legacyBiltyField } : {}),
      ...(legacy?.legacyBillField ? { legacyBillField: legacy.legacyBillField } : {}),
    };
  });
  const sectionNav = (
    <nav
      aria-label="Consignment form sections"
      className="sticky top-0 z-20 -mx-2 mb-5 border-y border-slate-200 bg-white/95 px-2 py-2 shadow-sm backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-3"
    >
      <div className="flex gap-2 overflow-x-auto">
        {FORM_SECTIONS.map((section, index) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-800"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-600">
              {index + 1}
            </span>
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );

  if (isLoadingRecord) {
    return <Loading fullPage label="Loading consignment…" />;
  }

  return (
    <FormProvider {...methods}>
      {/* ================================================================ */}
      {/* DRAFT BANNER                                                     */}
      {/* ================================================================ */}

      {draftBanner && (
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50/80 px-5 py-2 shadow-sm print:hidden">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                <span className="text-sm font-bold">!</span>
              </div>

              <div>
                <p className="text-sm font-semibold text-brand-900">
                  Unsaved draft available
                </p>

                <p className="mt-0.5 text-sm text-brand-700">
                  You have an unsaved draft for Consignment No.{" "}
                  <span className="font-semibold">
                    {draftBanner.consignmentNumber}
                  </span>
                  . Would you like to restore it?
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  reset(draftBanner);
                  setDraftBanner(null);
                  toast.success("Draft restored.");
                }}
                className="focus-ring rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
              >
                Restore Draft
              </button>

              <button
                type="button"
                onClick={() => {
                  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
                  setDraftBanner(null);
                }}
                aria-label="Dismiss and discard saved draft"
                className="focus-ring rounded-lg p-2 text-brand-700 transition hover:bg-brand-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      {previewOpen ? (
        <PrintPreview
          values={values}
          onClose={() => setPreviewOpen(false)}
        />
      ) : (
        <form
          className="mx-auto max-w-[1320px] space-y-4 pb-24 text-[12px]"
          onSubmit={(e) => e.preventDefault()}
        >
          <WorkflowTabs workflow="consignment" activePage="create" />
          <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-brand-50/60 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm">
                <FilePlus2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
                  Transport documents
                </p>
                <h1 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">
                  {editId ? "Edit Consignment" : "Create Lorry Receipt"}
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Enter the shipment, parties, route and charges. Your draft is saved automatically in this browser.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 sm:self-center">
              <span className="text-xs font-medium text-slate-500">LR No.</span>
              <span className="text-base font-bold text-brand-800">{values.consignmentNumber || "—"}</span>
            </div>
          </header>

          {sectionNav}

          <div id="consignment-details" className="scroll-mt-24">
            <ConsignmentInfoSection />
          </div>

          <section id="consignment-parties" className="scroll-mt-24">
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Parties</h2>
                <p className="mt-0.5 text-xs text-slate-500">Select a saved customer or enter new party details.</p>
              </div>
              <span className="hidden text-[11px] text-slate-500 sm:inline">Consignor → Consignee</span>
            </div>
            <div className="grid items-start gap-3 lg:grid-cols-2">
              <PartyCard
                prefix="consignor"
                title="Consignor"
                description="Party sending the goods."
              />
              <PartyCard
                prefix="consignee"
                title="Consignee"
                description="Party receiving the goods."
              />
            </div>
          </section>

          <section id="consignment-route" className="scroll-mt-24">
            <div className="grid items-start gap-3 lg:grid-cols-[1.5fr_1fr]">
              <RouteSection />
              <LoadTypeSection />
            </div>
          </section>

          <section id="consignment-shipment" className="scroll-mt-24">
            <div className="mb-2">
              <h2 className="text-sm font-bold text-slate-900">Goods & transport</h2>
              <p className="mt-0.5 text-xs text-slate-500">Add package, weight, invoice and vehicle information.</p>
            </div>
            <div className="grid items-start gap-3 xl:grid-cols-2">
              <ShipmentDetailsSection />
              <TransportDetailsSection />
            </div>
          </section>

          <section id="consignment-billing" className="scroll-mt-24">
            <div className="mb-2">
              <h2 className="text-sm font-bold text-slate-900">Charges & payment</h2>
              <p className="mt-0.5 text-xs text-slate-500">Enter freight and tax; totals update as you type.</p>
            </div>
            <div className="grid items-start gap-3 xl:grid-cols-[1.4fr_1fr]">
              <ChargesSection chargeDefinitions={formChargeDefinitions} />
              <div className="space-y-3">
                <BillingSummary />
                <GstSection />
              </div>
            </div>
            <div className="mt-3">
              <PaymentSection />
            </div>
          </section>

          <section id="consignment-additional" className="scroll-mt-24">
            <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block text-sm font-bold text-slate-900">Optional details</span>
                  <span className="mt-0.5 block text-xs text-slate-500">Insurance and private internal notes</span>
                </span>
                <ArrowDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="grid items-start gap-3 border-t border-slate-100 p-3 lg:grid-cols-2">
                <InsuranceSection />
                <AdditionalInfoSection />
              </div>
            </details>
          </section>

          <FormActionsBar
            isDirty={isDirty}
            isSubmitting={isSubmitting}
            draftSavedLabel={timeAgoLabel(lastSavedAt)}
            onSaveDraft={onSaveDraft}
            onSaveAndPrint={onSaveAndPrint}
            onPreview={() => setPreviewOpen(true)}
            onReset={onReset}
          />
        </form>
      )}
    </FormProvider>
  );
}

export default function TransportBillingFormPage() {
  return (
    <Suspense fallback={<Loading fullPage label="Loading…" />}>
      <TransportBillingForm />
    </Suspense>
  );
}