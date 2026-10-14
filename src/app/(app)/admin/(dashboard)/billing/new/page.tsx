"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useFieldArray, useWatch } from "react-hook-form";
import toast from "react-hot-toast";

import {
    freightBillFormSchema,
    type FreightBillFormValues,
    type BillItemValues,
} from "@/lib/bill/validations";
import { fetchNextBillNumber, saveLastBillNumber } from "@/lib/bill/Generatebillnumber";
import { createFreightBill, getConsignmentForBill, getFreightBill, updateFreightBill } from "@/lib/bill/api";

import { FreightBillHeader } from "@/components/bills/Freightbillheader";
import { BillMetaSection } from "@/components/bills/Billmetasection";
import { BilledToSection } from "@/components/bills/Billedtosection";
import { BillItemsTable } from "@/components/bills/Billitemstable";
import { FreightBillFormActionsBar } from "@/components/bills/Freightbillformactionsbar";
import { FreightBillPrintPreview } from "@/components/bills/Freightbillprintpreview";
import { ConsignmentListItem, ConsignmentRecord, getApiErrorMessage } from "@/lib/api/consignments";
import SelectedCnsChips from "@/components/bills/SelectedCnsChips";
import { useSearchParams } from "next/navigation";
import { Loading } from "@/components/ui/Loading";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { WorkflowTabs } from "@/components/admin/WorkflowTabs";
import { chargeLinesFromLegacy, DEFAULT_CHARGE_DEFINITIONS, type ChargeDefinition } from "@/lib/charges";

function buildDefaultValues(billNo: string): FreightBillFormValues {
    return {
        billStn: "",
        billNo,
        billDate: new Date().toISOString().slice(0, 10),
        billedToType: "Consignor",
        billedTo: { name: "", address: "", city: "", state: "", pincode: "", gstin: "", mobile: "" },
        items: [],
        remark: "",
        vehicleNumber: "",
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
    const [addingId, setAddingId] = useState<string | null>(null);
    const [isLoadingBill, setIsLoadingBill] = useState(Boolean(billId));

    const [firstConsignmentParties, setFirstConsignmentParties] = useState<{
        consignor?: ConsignmentRecord["consignor"];
        consignee?: ConsignmentRecord["consignee"];
    } | null>(null);

    const methods = useForm<FreightBillFormValues>({
        resolver: zodResolver(freightBillFormSchema),
        defaultValues: buildDefaultValues("…"),
        mode: "onBlur",
    });

    const {
        handleSubmit, reset, setValue, getValues, formState: { isSubmitting, dirtyFields }, } = methods;
    const billedToType = useWatch({ control: methods.control, name: "billedToType" });

    const applyBilledToFromParty = useCallback((source?: {
        name?: string; address?: string; city?: string; state?: string; pincode?: string; gstin?: string; mobile?: string;
    }) => {
        setValue("billedTo", {
            name: source?.name ?? "",
            address: source?.address ?? "",
            city: source?.city ?? "",
            state: source?.state ?? "",
            pincode: source?.pincode ?? "",
            gstin: source?.gstin ?? "",
            mobile: source?.mobile ?? "",
        });
    }, [setValue]);

    const { fields, append, remove } = useFieldArray({ control: methods.control, name: "items" });
    const chargeDefinitions = savedChargeDefinitions ?? companySettings.chargeDefinitions.filter((charge) => charge.includeOnBill);

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
                    reset({
                        ...bill,
                        items: bill.items.map((item) => ({
                            ...item,
                            chargeLines: Array.isArray(item.chargeLines)
                                ? item.chargeLines
                                : chargeLinesFromLegacy(item, definitions, "bill"),
                        })),
                    });
                    // useFieldArray needs `reset` with the same field name to pick up `items` —
                    // this works because `items` is part of `bill` and reset() re-syncs the array.

                    // We don't have the ORIGINAL consignor/consignee sub-docs anymore (only what
                    // was saved onto billedTo), so re-derive them so the Consignor/Consignee
                    // toggle still works correctly if the user flips it while editing.
                    if (bill.billedToType === "Consignor") {
                        setFirstConsignmentParties({ consignor: bill.billedTo });
                    } else if (bill.billedToType === "Consignee") {
                        setFirstConsignmentParties({ consignee: bill.billedTo });
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

    useEffect(() => {
        if (!firstConsignmentParties) return;
        if (billedToType === "Consignor") applyBilledToFromParty(firstConsignmentParties.consignor);
        else if (billedToType === "Consignee") applyBilledToFromParty(firstConsignmentParties.consignee);
        // Third Party: leave the fields alone — that's manual entry, don't clobber what's been typed.
    }, [applyBilledToFromParty, billedToType, firstConsignmentParties]);

    const excludeIds = fields.map((f) => f.consignmentId);

    async function handleCnsSelect(picked: ConsignmentListItem) {
        if (addingId) return; // ignore a second click while one is already being fetched/added
        setAddingId(picked._id);

        try {
            // The list endpoint's item is a slim shape (no address, loose charges) —
            // fetch the full record so the bill row and auto-filled party are accurate.
            const c = await getConsignmentForBill(picked._id);
            const isFirstItem = fields.length === 0;
            const newItem = consignmentToBillItem(c, fields.length + 1, chargeDefinitions);

            if (isFirstItem) {
                setFirstConsignmentParties({ consignor: c.consignor, consignee: c.consignee });
                const party = c.payment?.billingParty;
                // Only auto-pick Consignor/Consignee/Third Party if the user hasn't
                // already chosen one by hand — don't clobber a manual selection.
                if (!dirtyFields.billedToType) {
                    const suggestedType = party === "Consignor" || party === "Consignee" ? party : "Third Party";
                    setValue("billedToType", suggestedType);
                }

                // if (c.remark) setValue("remark", c.remark);
                // Auto-fill vehicle number from selected consignment, but don't
                // overwrite a value the user has already typed.
                if (c.vehicleNumber && !getValues("vehicleNumber")) setValue("vehicleNumber", c.vehicleNumber);
            } else if (c.payment?.billingParty && c.payment.billingParty !== getValues("billedToType")) {
                toast(
                    `Heads up: CNS ${c.consignmentNumber} is normally billed to ${c.payment.billingParty}, not ${getValues("billedToType")}.`,
                    { icon: "⚠️" }
                );
            }

            append(newItem);
            // console.log("newItem: ", newItem)
        } catch (error) {
            toast.error(getApiErrorMessage(error, `Couldn't load CNS ${picked.consignmentNumber}.`));
        } finally {
            setAddingId(null);
        }
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
        setFirstConsignmentParties(null);
        fetchNextBillNumber().then((billNo) => reset(buildDefaultValues(billNo)));
    }

    if (isLoadingBill) {
        return <Loading fullPage label="Loading bill…" />;
    }

    return (
        <FormProvider {...methods}>
            {previewOpen ? (
                <FreightBillPrintPreview onClose={() => setPreviewOpen(false)} />
            ) : (
                <form className="mx-auto max-w-3xl pb-24 text-[12px]" onSubmit={(e) => e.preventDefault()}>
                    <WorkflowTabs workflow="billing" activePage="create" />
                    <div className="rounded-lg border border-slate-300 p-4 shadow-sm">
                        <FreightBillHeader company={companySettings} />

                        <div className="border-b border-slate-300 py-2 text-[12px] text-slate-500">
                            Select a CNS No. below — Consignor/Consignee/Third Party and their details fill in automatically
                            from the first consignment you add. Already-paid consignments won&apos;t appear in the picker.
                        </div>

                        <BilledToSection excludeIds={excludeIds} onCnsSelect={handleCnsSelect} cnsDisabled={Boolean(addingId)} />
                        <BillMetaSection />

                        <div className="py-2">
                            <SelectedCnsChips fields={fields} onRemove={remove} />
                            <BillItemsTable fields={fields} onRemove={remove} chargeDefinitions={chargeDefinitions} />
                        </div>

                        <label className="mt-2 flex items-center gap-2 text-[12px]">
                            <span className="font-semibold">Vehicle Number</span>
                            <input
                                {...methods.register("vehicleNumber")}
                                className="focus-ring rounded border border-slate-300 px-2 py-1"
                            />
                        </label>
                        <label className="mt-2 flex items-center gap-2 text-[12px]">
                            <span className="font-semibold">Remark</span>
                            <input
                                {...methods.register("remark")}
                                className="focus-ring flex-1 rounded border border-slate-300 px-2 py-1"
                            />
                        </label>
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