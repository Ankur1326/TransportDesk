"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useFieldArray } from "react-hook-form";
import toast from "react-hot-toast";

import {
    freightBillFormSchema,
    type FreightBillFormValues,
    type BillItemValues,
} from "@/lib/bill/validations";
import { fetchNextBillNumber, saveLastBillNumber } from "@/lib/bill/Generatebillnumber";
import { createFreightBill, getConsignmentForBill, getFreightBill, updateFreightBill, type CustomerOption } from "@/lib/bill/api";

import { BillItemsTable } from "@/components/bills/Billitemstable";
import { CnsSelector } from "@/components/bills/Cnsselector";
import { BillToPicker, type PartyMode } from "@/components/bills/create/BillToPicker";
import { PartyBiltyPicker } from "@/components/bills/create/PartyBiltyPicker";
import { BillSummaryPanel } from "@/components/bills/create/BillSummaryPanel";
import { AdditionalDetailsCard } from "@/components/bills/create/AdditionalDetailsCard";
import { Input } from "@/components/ui/Input";
import { SectionCard } from "@/components/bills/create/ui";
import { RefreshCw } from "@/components/icons";
import { FreightBillFormActionsBar } from "@/components/bills/Freightbillformactionsbar";
import { FreightBillPrintPreview } from "@/components/bills/Freightbillprintpreview";
import { ConsignmentListItem, ConsignmentRecord, getApiErrorMessage } from "@/lib/api/consignments";
import SelectedCnsChips from "@/components/bills/SelectedCnsChips";
import { useSearchParams } from "next/navigation";
import { Loading } from "@/components/ui/Loading";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { chargeLinesFromLegacy, DEFAULT_CHARGE_DEFINITIONS, type ChargeDefinition } from "@/lib/charges";

function buildDefaultValues(billNo: string): FreightBillFormValues {
    return {
        billStn: "",
        billNo,
        billDate: new Date().toISOString().slice(0, 10),
        billedToType: "Consignor",
        billedTo: { name: "", address: "", city: "", state: "", pincode: "", gstin: "", mobile: "", country: "", email: "" },
        items: [],
        remark: "",
        vehicleNumber: "",
        hsnCode: "",
        bankDetails: { accountHolderName: "", bankName: "", accountNumber: "", ifscCode: "" },
        adjustments: {
            discount: 0,
            gstMode: "None",
            gstRate: 0,
            tdsMode: "Deduction",
            tdsRate: 0,
            roundOff: false,
            advanceReceived: 0,
            advanceDate: "",
            advanceVia: "Cash",
        },
    };
}

/** Maps a FULL consignment record (from get-one) onto a bill line item. See mapping
 *  assumptions (LR/Detention/GSTIN charges) documented in lib/validations/freightBill.ts. */
function consignmentToBillItem(c: ConsignmentRecord, srNo: number, definitions: ChargeDefinition[]): BillItemValues {
    const legacyDefinitions = [...definitions, ...DEFAULT_CHARGE_DEFINITIONS.filter(
        (defaultDefinition) => !definitions.some((definition) => definition.id === defaultDefinition.id)
    )];
    const sourceLines = c.charges?.chargeLines ?? chargeLinesFromLegacy(c.charges ?? {}, legacyDefinitions, "bilty");
    return {
        consignmentId: c._id,
        srNo,
        cnsNo: c.consignmentNumber,
        bookingStn: c.from?.location ?? "",
        toStn: c.to?.location ?? "",
        date: (c.bookingDate || c.cnsDate || "").toString().slice(0, 10),
        freightAmt: c.charges?.freight ?? 0,
        lrCharges: c.charges?.localCollectionCharges ?? 0,
        detentionCharges: 0,
        unloadingCharges: c.charges?.unloadingCharge ?? 0,
        loadingCharges: c.charges?.loadingCharge ?? 0,
        gstinCharges: 0,
        chargeLines: definitions.map((definition) => ({
            chargeId: definition.id,
            name: definition.name,
            amount: sourceLines.find((line) => line.chargeId === definition.id)?.amount
                ?? (definition.legacyBiltyField && Number.isFinite(Number(Reflect.get(c.charges ?? {}, definition.legacyBiltyField)))
                    ? Number(Reflect.get(c.charges ?? {}, definition.legacyBiltyField))
                    : undefined)
                ?? definition.defaultAmount
                ?? 0,
        })),
        sourceBillingParty: (c.payment?.billingParty as BillItemValues["sourceBillingParty"]) || "",
    };
}

function FreightBillForm() {
    const searchParams = useSearchParams();
    const billId = searchParams.get("id"); // null when creating a new bill
    const { settings: companySettings } = useCompanySettings();
    const [savedChargeDefinitions, setSavedChargeDefinitions] = useState<ChargeDefinition[] | null>(null);

    const [previewOpen, setPreviewOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [isLoadingBill, setIsLoadingBill] = useState(Boolean(billId));
    const [partyMode, setPartyMode] = useState<PartyMode | null>(null);
    const [partyName, setPartyName] = useState<string | null>(null);

    const methods = useForm<FreightBillFormValues>({
        resolver: zodResolver(freightBillFormSchema),
        defaultValues: buildDefaultValues("…"),
        mode: "onBlur",
    });

    const {
        handleSubmit, reset, setValue, getValues, formState: { isSubmitting, errors },
    } = methods;

    const { fields, append, remove, replace } = useFieldArray({ control: methods.control, name: "items" });
    const chargeDefinitions = savedChargeDefinitions ?? companySettings.chargeDefinitions.filter((charge) => charge.includeOnBill);

    const clearBilledTo = useCallback(() => {
        setValue("billedTo", { name: "", address: "", city: "", state: "", pincode: "", gstin: "", mobile: "", country: "", email: "" });
    }, [setValue]);

    useEffect(() => {
        if (billId) {
            getFreightBill(billId)
                .then((bill) => {
                    const snapshotDefinitions = bill.items.flatMap((item) => item.chargeLines ?? [])
                        .reduce<ChargeDefinition[]>((definitions, line) => {
                            if (!definitions.some((definition) => definition.id === line.chargeId)) {
                                definitions.push({
                                    id: line.chargeId,
                                    name: line.name,
                                    defaultAmount: 0,
                                    includeOnBilty: false,
                                    includeOnBill: true,
                                });
                            }
                            return definitions;
                        }, []);
                    const legacyDefinitions = DEFAULT_CHARGE_DEFINITIONS.filter((definition) => definition.legacyBillField);
                    const definitions = snapshotDefinitions.length ? snapshotDefinitions : legacyDefinitions;
                    setSavedChargeDefinitions(definitions);
                    const defaults = buildDefaultValues(bill.billNo);
                    reset({
                        ...defaults,
                        ...bill,
                        bankDetails: { ...defaults.bankDetails, ...bill.bankDetails },
                        adjustments: { ...defaults.adjustments!, ...bill.adjustments },
                        billDate: String(bill.billDate).slice(0, 10),
                        items: bill.items.map((item) => ({
                            ...item,
                            chargeLines: Array.isArray(item.chargeLines)
                                ? item.chargeLines
                                : chargeLinesFromLegacy(item, definitions, "bill"),
                        })),
                    });
                    // A saved bill keeps its party; let the user add more of that party's LRs.
                    if (bill.billedToType === "Third Party") {
                        setPartyMode("manual");
                    } else {
                        setPartyMode("company");
                        setPartyName(bill.billedTo.name);
                    }
                })
                .catch((err) => {
                    toast.error(getApiErrorMessage(err, "Couldn't load this bill."));
                })
                .finally(() => setIsLoadingBill(false));
        } else {
            fetchNextBillNumber().then((billNo) => setValue("billNo", billNo, { shouldDirty: false }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [billId]);

    // Prefill the bank block from Settings once (new bills only, never over saved/typed values).
    useEffect(() => {
        if (billId) return;
        const bank = getValues("bankDetails");
        if (bank && Object.values(bank).some(Boolean)) return;
        const { accountHolderName, bankName, accountNumber, ifscCode } = companySettings;
        if (accountHolderName || bankName || accountNumber || ifscCode) {
            setValue("bankDetails", { accountHolderName, bankName, accountNumber, ifscCode });
        }
    }, [billId, companySettings, getValues, setValue]);

    // SR NO always follows selection order: 1 for the first LR picked, 2 for the second, …
    useEffect(() => {
        fields.forEach((_, i) => setValue(`items.${i}.srNo`, i + 1));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fields.length, setValue]);

    const selectedIds = fields.map((f) => f.consignmentId);

    function handleModeChange(mode: PartyMode) {
        if (mode === partyMode) return;
        setPartyMode(mode);
        setPartyName(null);
        clearBilledTo();
        if (fields.length) {
            replace([]);
            toast("Selected bilties were cleared because the billing party changed.", { icon: "ℹ️" });
        }
    }

    function handleClearParty() {
        setPartyName(null);
        clearBilledTo();
        if (fields.length) {
            replace([]);
            toast("Selected bilties were cleared because the billing party changed.", { icon: "ℹ️" });
        }
    }

    function handleCustomerSelected(customer: CustomerOption) {
        setValue("billedTo", {
            name: customer.name,
            address: customer.address ?? "",
            city: customer.city ?? "",
            state: customer.state ?? "",
            pincode: customer.pincode ?? "",
            gstin: customer.gstin ?? "",
            mobile: customer.mobile ?? "",
            country: "",
            email: customer.email ?? "",
        }, { shouldDirty: true, shouldValidate: true });
        setPartyName(customer.name);
    }

    /** Fetch the full record(s), build the bill rows and append them; SR NO continues from what's already there. */
    async function addConsignments(picked: ConsignmentListItem[]) {
        if (busy || picked.length === 0) return;
        setBusy(true);
        try {
            const records = await Promise.all(picked.map((p) => getConsignmentForBill(p._id)));
            const base = getValues("items").length;
            const newItems = records.map((record, i) => consignmentToBillItem(record, base + i + 1, chargeDefinitions));

            if (base === 0) {
                const first = records[0];
                if (partyMode === "manual" || !partyName) {
                    setValue("billedToType", "Third Party");
                } else {
                    const same = (a?: string, b?: string) => (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
                    setValue("billedToType", same(first.consignor?.name, partyName) ? "Consignor" : "Consignee");
                }
                // Auto-fill vehicle number from the first LR, but never over something already typed.
                if (first.vehicleNumber && !getValues("vehicleNumber")) setValue("vehicleNumber", first.vehicleNumber);
            }

            append(newItems);
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Couldn't load the selected bilty."));
        } finally {
            setBusy(false);
        }
    }

    function removeByConsignmentId(consignmentId: string) {
        const index = getValues("items").findIndex((item) => item.consignmentId === consignmentId);
        if (index >= 0) remove(index);
    }

    const onSaveAndPrint = handleSubmit(
        async (values) => {
            const normalized = { ...values, items: values.items.map((item, i) => ({ ...item, srNo: i + 1 })) };
            try {
                if (billId) {
                    await updateFreightBill(billId, normalized);
                    toast.success(`Bill ${normalized.billNo} updated.`);
                } else {
                    await createFreightBill(normalized);
                    saveLastBillNumber(normalized.billNo);
                    setPreviewOpen(true);
                    setTimeout(() => window.print(), 150);
                    toast.success(`Bill saved — Bill No: ${normalized.billNo}`);
                }
            } catch (error) {
                toast.error(getApiErrorMessage(error, "Couldn't save the bill. Please try again."));
            }
        },
        () => toast.error("Please fix the highlighted fields before saving.")
    );

    // const onSaveAndPrint = handleSubmit(
    //     async (values) => {
    //         const normalized = { ...values, items: values.items.map((item, i) => ({ ...item, srNo: i + 1 })) };
    //         try {
    //             await createFreightBill(normalized);
    //             saveLastBillNumber(normalized.billNo);
    //             setPreviewOpen(true);
    //             // Give the preview a tick to actually mount/paint before the print
    //             // dialog steals focus — window.print() called synchronously right
    //             // after setPreviewOpen can fire before React has rendered it.
    //             setTimeout(() => window.print(), 150);
    //         } catch (error) {
    //             toast.error(getApiErrorMessage(error, "Couldn't save the bill. Please try again."));
    //         }
    //     },
    //     () => toast.error("Please fix the highlighted fields before saving.")
    // );

    const onPreview = handleSubmit(
        () => setPreviewOpen(true),
        () => toast.error("Please fix the highlighted fields before previewing.")
    );

    function onReset() {
        setPartyMode(null);
        setPartyName(null);
        fetchNextBillNumber().then((billNo) => reset(buildDefaultValues(billNo)));
    }

    async function refreshBillNumber() {
        try {
            setValue("billNo", await fetchNextBillNumber(), { shouldDirty: true });
        } catch {
            toast.error("Couldn't fetch the next bill number.");
        }
    }

    if (isLoadingBill) {
        return <Loading fullPage label="Loading bill…" />;
    }

    return (
        <FormProvider {...methods}>
            {previewOpen ? (
                <FreightBillPrintPreview onClose={() => setPreviewOpen(false)} />
            ) : (
                <form className="mx-auto max-w-6xl space-y-4 pb-28" onSubmit={(e) => e.preventDefault()}>

                    {/* Bill number + date */}
                    <SectionCard>
                        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_8rem]">
                            <div className="relative">
                                <Input
                                    size="compact"
                                    label="Invoice / Bill number"
                                    hi="बिल नंबर"
                                    error={errors.billNo?.message}
                                    className={billId ? undefined : "pr-9"}
                                    {...methods.register("billNo")}
                                />
                                {!billId && (
                                    <button
                                        type="button"
                                        onClick={refreshBillNumber}
                                        aria-label="Get next bill number"
                                        className="focus-ring absolute right-1 top-[18px] flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-200"
                                    >
                                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                            <Input size="compact" type="date" label="Date" hi="तारीख" {...methods.register("billDate")} />
                            <Input size="compact" label="Bill STN (optional)" hi="बिल एसटीएन" placeholder="e.g. WGH" className="uppercase" {...methods.register("billStn")} />
                        </div>
                    </SectionCard>

                    <BillToPicker
                        mode={partyMode}
                        onModeChange={handleModeChange}
                        partyName={partyName}
                        onCustomerSelected={handleCustomerSelected}
                        onClearParty={handleClearParty}
                    />

                    {/* Customer chosen: every unbilled LR where they are consignor or consignee */}
                    {partyName && (
                        <PartyBiltyPicker
                            key={partyName}
                            partyName={partyName}
                            selectedIds={selectedIds}
                            busy={busy}
                            onAdd={addConsignments}
                            onRemoveId={removeByConsignmentId}
                        />
                    )}

                    {/* Manual party: look up any LR by number */}
                    {partyMode === "manual" && (
                        <SectionCard title="Add Bilty by LR number">
                            <CnsSelector excludeIds={selectedIds} onSelect={(c) => addConsignments([c])} disabled={busy} />
                        </SectionCard>
                    )}

                    <SectionCard title="LR Details">
                        <SelectedCnsChips fields={fields} onRemove={remove} />
                        <BillItemsTable fields={fields} onRemove={remove} chargeDefinitions={chargeDefinitions} />
                        {(errors.items?.message || errors.items?.root?.message) && (
                            <p className="mt-2 text-xs text-red-600">{errors.items?.message || errors.items?.root?.message}</p>
                        )}
                    </SectionCard>

                    <div className="grid items-start gap-4 lg:grid-cols-2">
                        <AdditionalDetailsCard />
                        <BillSummaryPanel />
                    </div>

                    <FreightBillFormActionsBar
                        isSubmitting={isSubmitting}
                        // onSaveDraft={onSaveDraft}
                        onSaveAndPrint={onSaveAndPrint}
                        onPreview={onPreview}
                        onReset={onReset}
                    />
                </form>
            )}
        </FormProvider>
    );
}

export default function FreightBillFormPage() {
    return (
        <Suspense fallback={<Loading fullPage label="Loading…" />}>
            <FreightBillForm />
        </Suspense>
    )
}