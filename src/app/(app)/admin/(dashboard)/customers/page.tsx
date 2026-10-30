'use client'
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { AppDispatch, RootState } from "@/redux/store";
import { createCustomer, updateCustomer, deleteCustomer } from "@/redux/slices/customerSlice";
import {
    clearLedger,
    DEFAULT_LEDGER_FILTERS,
    fetchCustomerSummaries,
    fetchLedger,
    type LedgerCustomerInfo,
    type LedgerFilterState,
} from "@/redux/slices/ledgerSlice";
import { EditOrCreateNewModalWrapper } from "@/components/EditOrCreateNewModalWrapper";
import FormInput from "@/components/FormInput";
import FormTextarea from "@/components/FormTextarea";
import StateAutocomplete from "@/components/StateAutocomplete";
import { Button } from "@/components/Button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ApiErrorState } from "@/components/ui/ApiErrorState";
import { CompanySetupNotice } from "@/components/admin/CompanySetupNotice";
import { CompanyProfileRequiredDialog } from "@/components/admin/CompanyProfileRequiredDialog";
import { OpeningBalanceField } from "@/components/parties/OpeningBalanceField";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { CUSTOMER_BALANCE_LABELS, type BalanceType } from "@/lib/opening-balance";
import type { LedgerEntry } from "@/lib/ledger/build-ledger";
import { PartyListPanel } from "@/components/ledger/PartyListPanel";
import { LedgerHeader } from "@/components/ledger/LedgerHeader";
import { LedgerSummaryChips } from "@/components/ledger/LedgerSummaryChips";
import { LedgerEntryRow } from "@/components/ledger/LedgerEntryRow";
import { LedgerEntryDrawer } from "@/components/ledger/LedgerEntryDrawer";
import { LedgerSkeleton } from "@/components/ledger/LedgerSkeleton";
import { NoCustomerSelected, NoLedgerEntries } from "@/components/ledger/LedgerEmptyState";

type CustomerPayload = Parameters<typeof updateCustomer>[0];

const filtersAreDefault = (f: LedgerFilterState) =>
    f.from === "" && f.to === "" && f.type === "all" && f.search === "" && f.includeUnbilled;

export default function CustomerLedgerPage() {
    const dispatch = useDispatch<AppDispatch>();
    const {
        parties, partiesPage, partiesTotalPages, partiesStatus, partiesError,
        ledger, ledgerStatus, ledgerError,
    } = useSelector((state: RootState) => state.ledger);

    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [filters, setFilters] = useState<LedgerFilterState>(DEFAULT_LEDGER_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState<LedgerFilterState>(DEFAULT_LEDGER_FILTERS);
    const [openEntry, setOpenEntry] = useState<LedgerEntry | null>(null);

    // Customer add / edit / delete (moved here from the old table page)
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [pincode, setPincode] = useState("");
    const [gstin, setGstin] = useState("");
    const [mobile, setMobile] = useState("");
    const [email, setEmail] = useState("");
    const [openingBalance, setOpeningBalance] = useState("");
    const [balanceType, setBalanceType] = useState<BalanceType>("debit");
    const [isModalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<LedgerCustomerInfo | null>(null);
    const [isDeleteOpen, setDeleteOpen] = useState(false);
    const { settings: companySettings, hasLoaded: companyLoaded, error: companyError } = useCompanySettings();
    const [showCompanyRequired, setShowCompanyRequired] = useState(false);

    // ── data loading ────────────────────────────────────────────────
    const loadParties = useCallback(
        (page: number) => { dispatch(fetchCustomerSummaries({ search, currentPage: page })); },
        [dispatch, search]
    );

    useEffect(() => { loadParties(1); }, [loadParties]);

    // Debounce filter changes (the bill / LR search box types fast).
    useEffect(() => {
        const t = setTimeout(() => setAppliedFilters(filters), 300);
        return () => clearTimeout(t);
    }, [filters]);

    useEffect(() => {
        if (selectedId) dispatch(fetchLedger({ id: selectedId, filters: appliedFilters, currentPage: 1 }));
    }, [dispatch, selectedId, appliedFilters]);

    const refresh = useCallback(() => {
        loadParties(1);
        if (selectedId) dispatch(fetchLedger({ id: selectedId, filters: appliedFilters, currentPage: 1 }));
    }, [dispatch, loadParties, selectedId, appliedFilters]);

    const selectCustomer = (id: string) => {
        setSelectedId(id);
        setFilters(DEFAULT_LEDGER_FILTERS);
        setAppliedFilters(DEFAULT_LEDGER_FILTERS);
        setOpenEntry(null);
    };

    const goBack = () => {
        setSelectedId(null);
        setOpenEntry(null);
        dispatch(clearLedger());
    };

    const loadMoreEntries = () => {
        if (selectedId && ledger) {
            dispatch(fetchLedger({ id: selectedId, filters: appliedFilters, currentPage: ledger.pagination.currentPage + 1 }));
        }
    };

    // ── customer CRUD ───────────────────────────────────────────────
    const handleCreateNewCustomer = () => {
        // No company name yet -> explain instead of opening the form (the API refuses too).
        if (companyLoaded && !companyError && !companySettings.companyName.trim()) {
            setShowCompanyRequired(true);
            return;
        }
        setName(""); setAddress(""); setCity(""); setState(""); setPincode("");
        setGstin(""); setMobile(""); setEmail(""); setOpeningBalance(""); setBalanceType("debit");
        setEditing(null);
        setModalVisible(true);
    };

    const onEdit = () => {
        const c = ledger?.customer;
        if (!c) return;
        setEditing(c);
        setName(c.name); setAddress(c.address ?? ""); setCity(c.city ?? ""); setState(c.state ?? "");
        setPincode(c.pincode ?? ""); setGstin(c.gstin ?? ""); setMobile(c.mobile ?? ""); setEmail(c.email ?? "");
        setOpeningBalance(c.openingBalance ? String(c.openingBalance) : "");
        setBalanceType(c.balanceType === "credit" ? "credit" : "debit");
        setModalVisible(true);
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const data = { name, address, city, state, pincode, gstin, mobile, email, openingBalance: Number(openingBalance) || 0, balanceType };
        if (editing) {
            const payload: CustomerPayload = { ...data, _id: editing._id, createdAt: editing.createdAt, updatedAt: editing.createdAt };
            const action = await dispatch(updateCustomer(payload));
            if (updateCustomer.fulfilled.match(action) && action.payload) {
                setModalVisible(false);
                refresh();
            }
        } else {
            const action = await dispatch(createCustomer(data));
            if (createCustomer.fulfilled.match(action) && action.payload) {
                setModalVisible(false);
                loadParties(1);
                const createdId: unknown = action.payload._id;
                if (typeof createdId === "string") selectCustomer(createdId);
            }
        }
    };

    const handleDelete = async () => {
        const id = selectedId;
        setDeleteOpen(false);
        if (!id) return;
        const action = await dispatch(deleteCustomer(id));
        if (deleteCustomer.fulfilled.match(action)) {
            toast.success("Successfully deleted Customer");
            goBack();
            loadParties(1);
        }
    };

    // ── render ──────────────────────────────────────────────────────
    const entries = ledger?.entries ?? [];
    const hasMoreEntries = ledger ? ledger.pagination.currentPage < ledger.pagination.totalPages : false;
    const filtersActive = useMemo(() => !filtersAreDefault(appliedFilters), [appliedFilters]);

    return (
        <div className="container mx-auto p-2 sm:p-4">
            <CompanyProfileRequiredDialog
                open={showCompanyRequired}
                action="add customers"
                onClose={() => setShowCompanyRequired(false)}
            />
            <CompanySetupNotice className="mb-3" />

            <div className="flex h-[calc(100dvh-8rem)] min-h-[520px] overflow-hidden rounded-lg border border-neutral-200 bg-(--ledger-surface) dark:border-neutral-700">
                {/* LEFT: customer list (full screen on mobile until one is chosen) */}
                <section className={`${selectedId ? "hidden md:flex" : "flex"} w-full flex-col md:w-[38%] md:max-w-md md:border-r md:border-neutral-200 dark:md:border-neutral-700`}>
                    <PartyListPanel
                        parties={parties}
                        isLoading={partiesStatus === "loading"}
                        error={partiesError}
                        hasMore={partiesPage < partiesTotalPages}
                        selectedId={selectedId}
                        onSelect={selectCustomer}
                        onSearch={setSearch}
                        onLoadMore={() => loadParties(partiesPage + 1)}
                        onRetry={() => loadParties(1)}
                        onAdd={handleCreateNewCustomer}
                    />
                </section>

                {/* RIGHT: ledger */}
                <section className={`${selectedId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
                    {!selectedId ? (
                        <NoCustomerSelected />
                    ) : (
                        <>
                            <div className="p-3 pb-0">
                                <LedgerHeader
                                    name={ledger?.customer.name ?? parties.find((p) => p._id === selectedId)?.name ?? ""}
                                    netBalance={ledger?.summary.overallNetBalance ?? parties.find((p) => p._id === selectedId)?.netBalance ?? 0}
                                    filters={filters}
                                    filtersActive={filtersActive}
                                    onFiltersChange={setFilters}
                                    onBack={goBack}
                                    onEdit={onEdit}
                                    onDelete={() => setDeleteOpen(true)}
                                />
                            </div>

                            {ledger && <LedgerSummaryChips summary={ledger.summary} />}

                            <div className="min-h-0 flex-1 overflow-y-auto">
                                {ledgerError && !ledger ? (
                                    <ApiErrorState error={ledgerError} onRetry={refresh} className="m-3" />
                                ) : ledgerStatus === "loading" && !ledger ? (
                                    <LedgerSkeleton />
                                ) : ledger && entries.length === 0 ? (
                                    <NoLedgerEntries filtered={filtersActive} />
                                ) : (
                                    <ul>
                                        {entries.map((entry) => (
                                            <LedgerEntryRow
                                                key={entry.id}
                                                entry={entry}
                                                selected={openEntry?.id === entry.id}
                                                onOpen={setOpenEntry}
                                            />
                                        ))}
                                    </ul>
                                )}
                                {hasMoreEntries && (
                                    <div className="p-3 text-center">
                                        <Button size="sm" variant="outline" onClick={loadMoreEntries} isLoading={ledgerStatus === "loading"}>
                                            Load more entries
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 bg-white p-3 dark:bg-neutral-900">
                                {/* Wired up in phase 3 (RecordPaymentDialog). */}
                                <button type="button" disabled title="Coming soon" className="h-10 cursor-not-allowed rounded-md bg-(--receivable-soft) text-sm font-semibold text-(--receivable) opacity-70">
                                    Receivable (Debit)
                                </button>
                                <button type="button" disabled title="Coming soon" className="h-10 cursor-not-allowed rounded-md bg-(--received-soft) text-sm font-semibold text-(--received) opacity-70">
                                    Received (Credit)
                                </button>
                            </div>
                        </>
                    )}
                </section>
            </div>

            <LedgerEntryDrawer
                entry={openEntry}
                billStatus={openEntry?.billId ? ledger?.billStatuses[openEntry.billId] : undefined}
                onClose={() => setOpenEntry(null)}
            />

            <EditOrCreateNewModalWrapper
                title={editing ? "Edit Customer" : "Create Customer"}
                isVisible={isModalVisible}
                onClose={() => setModalVisible(false)}
                onSave={handleSave}
                size="large"
            >
                <div className="form-group mb-5">
                    <FormInput label="Company / Customer Name" value={name} onChange={(e) => setName(e.target.value)} required={true} placeholder="Customer Name" />
                </div>
                <div className="form-group mb-5">
                    <FormTextarea
                        label='Address'
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required={false}
                        className="w-full"
                        placeholder="Enter customer address (optional)"
                    />
                </div>
                <div className="form-group mb-5">
                    <FormInput label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                </div>
                <div className="form-group mb-5">
                    <StateAutocomplete value={state} onChange={(val) => setState(val)} required={false} />
                </div>
                <div className="form-group mb-5">
                    <FormInput label="Pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="Pincode" />
                </div>
                <div className="form-group mb-5">
                    <FormInput label="Gstin" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="Gstin" />
                </div>
                <div className="form-group mb-5">
                    <FormInput label="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile" />
                </div>
                <div className="form-group mb-5">
                    <FormInput label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
                </div>
                <div className="form-group mb-5">
                    <OpeningBalanceField
                        amount={openingBalance}
                        type={balanceType}
                        onAmountChange={setOpeningBalance}
                        onTypeChange={setBalanceType}
                        labels={CUSTOMER_BALANCE_LABELS}
                    />
                </div>
            </EditOrCreateNewModalWrapper>

            <AlertDialog open={isDeleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the customer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
