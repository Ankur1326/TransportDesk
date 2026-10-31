'use client'
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { AppDispatch, RootState } from "@/redux/store";
import {
    clearLedger,
    DEFAULT_LEDGER_FILTERS,
    deleteContract,
    deletePayment,
    fetchLedger,
    fetchPartySummaries,
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
import { CUSTOMER_BALANCE_LABELS, SUPPLIER_BALANCE_LABELS, type BalanceType } from "@/lib/opening-balance";
import { PARTY_CONFIG, type PartyKind } from "@/lib/ledger/party-kind";
import type { LedgerEntry } from "@/lib/ledger/build-ledger";
import { formatInr, reminderMessage } from "@/lib/ledger/format";
import { runningBalances } from "@/lib/ledger/build-ledger";
import { openStatementPdf, shareStatementOnWhatsApp, whatsappLink, type StatementRange } from "@/lib/ledger/statement-url";
import { PartyListPanel } from "@/components/ledger/PartyListPanel";
import { LedgerHeader } from "@/components/ledger/LedgerHeader";
import { LedgerSummaryChips } from "@/components/ledger/LedgerSummaryChips";
import { LedgerEntryList } from "@/components/ledger/LedgerEntryList";
import { LedgerToolbar } from "@/components/ledger/LedgerToolbar";
import { LedgerEntryDrawer } from "@/components/ledger/LedgerEntryDrawer";
import { LedgerAgeing } from "@/components/ledger/LedgerAgeing";
import { RecordPaymentDialog, type PaymentDirection } from "@/components/ledger/RecordPaymentDialog";
import { ContractDialog } from "@/components/ledger/ContractDialog";
import { LedgerSkeleton } from "@/components/ledger/LedgerSkeleton";
import { NoCustomerSelected, NoLedgerEntries } from "@/components/ledger/LedgerEmptyState";

/** The fields of the add / edit form, identical for customers and suppliers. */
export interface PartyFormData {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    gstin: string;
    mobile: string;
    email: string;
    openingBalance: number;
    balanceType: BalanceType;
}

/** Saving goes through each party's own slice; the screen only needs these three actions. */
export interface PartyCrud {
    /** Returns the new party's id, or null when it failed (the slice already toasted why). */
    create: (data: PartyFormData) => Promise<string | null>;
    update: (id: string, data: PartyFormData, createdAt: string) => Promise<boolean>;
    remove: (id: string) => Promise<boolean>;
}

const filtersAreDefault = (f: LedgerFilterState) =>
    f.from === "" && f.to === "" && f.type === "all" && f.search === "" && f.includeUnbilled;

export function PartyLedgerScreen({ kind, crud }: { kind: PartyKind; crud: PartyCrud }) {
    const cfg = PARTY_CONFIG[kind];
    const doc = cfg.docWord.toLowerCase();
    // The payment dialog's two directions: money moving, and a manual entry that raises the balance.
    const dirDecrease: PaymentDirection = kind === "customer" ? "received" : "paid";
    const dirIncrease: PaymentDirection = kind === "customer" ? "receivable_adjustment" : "payable_adjustment";
    const dispatch = useDispatch<AppDispatch>();
    const {
        parties, partiesTotal, partiesPage, partiesTotalPages, partiesStatus, partiesError,
        ledger, ledgerStatus, ledgerError,
    } = useSelector((state: RootState) => state.ledger);

    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [filters, setFilters] = useState<LedgerFilterState>(DEFAULT_LEDGER_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState<LedgerFilterState>(DEFAULT_LEDGER_FILTERS);
    const [openEntry, setOpenEntry] = useState<LedgerEntry | null>(null);
    const [showBalance, setShowBalance] = useState(false);

    // Record / edit payment, and delete confirmation
    const [paymentDialog, setPaymentDialog] = useState<{
        direction: PaymentDirection;
        editing: LedgerEntry | null;
        presetBillId?: string;
        key: number;
    } | null>(null);
    const [paymentToDelete, setPaymentToDelete] = useState<LedgerEntry | null>(null);
    // Suppliers: add / edit / delete a lorry hire contract
    const [contractDialog, setContractDialog] = useState<{ editing: LedgerEntry | null; key: number } | null>(null);
    const [contractToDelete, setContractToDelete] = useState<LedgerEntry | null>(null);
    const [statementBusy, setStatementBusy] = useState(false);

    // Party add / edit / delete
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [pincode, setPincode] = useState("");
    const [gstin, setGstin] = useState("");
    const [mobile, setMobile] = useState("");
    const [email, setEmail] = useState("");
    const [openingBalance, setOpeningBalance] = useState("");
    const [balanceType, setBalanceType] = useState<BalanceType>(kind === "supplier" ? "credit" : "debit");
    const [isModalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<LedgerCustomerInfo | null>(null);
    const [isDeleteOpen, setDeleteOpen] = useState(false);
    const { settings: companySettings, hasLoaded: companyLoaded, error: companyError } = useCompanySettings();
    const [showCompanyRequired, setShowCompanyRequired] = useState(false);

    // The ledger state is shared by the customer and supplier screens: don't leave one's ledger showing on the other.
    useEffect(() => () => { dispatch(clearLedger()); }, [dispatch]);

    // ── data loading ────────────────────────────────────────────────
    const loadParties = useCallback(
        (page: number, keepCurrent = false) => { dispatch(fetchPartySummaries({ kind, search, currentPage: page, keepCurrent })); },
        [dispatch, kind, search]
    );

    useEffect(() => { loadParties(1); }, [loadParties]);

    // Debounce filter changes (the bill / LR search box types fast).
    useEffect(() => {
        const t = setTimeout(() => setAppliedFilters(filters), 300);
        return () => clearTimeout(t);
    }, [filters]);

    useEffect(() => {
        if (selectedId) dispatch(fetchLedger({ kind, id: selectedId, filters: appliedFilters, currentPage: 1 }));
    }, [dispatch, kind, selectedId, appliedFilters]);

    // Refetch in place: the list and ledger stay on screen until the fresh data arrives.
    const refresh = useCallback(() => {
        loadParties(1, true);
        if (selectedId) dispatch(fetchLedger({ kind, id: selectedId, filters: appliedFilters, currentPage: 1, keepCurrent: true }));
    }, [dispatch, kind, loadParties, selectedId, appliedFilters]);

    const selectParty = (id: string) => {
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
            dispatch(fetchLedger({ kind, id: selectedId, filters: appliedFilters, currentPage: ledger.pagination.currentPage + 1 }));
        }
    };

    // ── payments ────────────────────────────────────────────────────
    const openPaymentDialog = (direction: PaymentDirection, editing: LedgerEntry | null = null, presetBillId?: string) => {
        setOpenEntry(null); // the drawer would otherwise sit under the dialog
        setPaymentDialog({ direction, editing, presetBillId, key: Date.now() });
    };

    const handlePaymentSaved = (message: string) => {
        setPaymentDialog(null);
        toast.success(message);
        refresh();
    };

    const askDeletePayment = (entry: LedgerEntry) => {
        setOpenEntry(null);
        setPaymentToDelete(entry);
    };

    const handleDeletePayment = async () => {
        const entry = paymentToDelete;
        setPaymentToDelete(null);
        if (!entry) return;
        try {
            const result = await dispatch(deletePayment({ kind, _id: entry.sourceId })).unwrap();
            toast.success(result.message);
            refresh();
        } catch (err) {
            toast.error(typeof err === "string" ? err : "Couldn't delete this payment.");
        }
    };

    // ── lorry hire contracts (suppliers) ────────────────────────────
    const openContractDialog = (editing: LedgerEntry | null = null) => {
        setOpenEntry(null);
        setContractDialog({ editing, key: Date.now() });
    };

    const handleContractSaved = (message: string) => {
        setContractDialog(null);
        toast.success(message);
        refresh();
    };

    const askDeleteContract = (entry: LedgerEntry) => {
        setOpenEntry(null);
        setContractToDelete(entry);
    };

    const handleDeleteContract = async () => {
        const entry = contractToDelete;
        setContractToDelete(null);
        if (!entry) return;
        try {
            const result = await dispatch(deleteContract({ _id: entry.sourceId })).unwrap();
            toast.success(result.message);
            refresh();
        } catch (err) {
            toast.error(typeof err === "string" ? err : "Couldn't delete this contract.");
        }
    };

    const handleSendReminder = () => {
        const c = ledger?.customer;
        if (!c) return;
        const text = reminderMessage(c.name, ledger.summary.overallNetBalance, companySettings.companyName.trim());
        window.open(whatsappLink(c.mobile, text), "_blank", "noopener");
    };

    // ── statement ───────────────────────────────────────────────────
    // The statement is always complete for its period: it honours the date range and the
    // unbilled toggle, but not the type filter or the search box.
    const statementRange: StatementRange = {
        from: appliedFilters.from,
        to: appliedFilters.to,
        includeUnbilled: appliedFilters.includeUnbilled,
    };

    const handleDownloadStatement = () => {
        if (selectedId) openStatementPdf(selectedId, statementRange, kind);
    };

    const handleShareStatement = async () => {
        const c = ledger?.customer;
        if (!c || statementBusy) return;
        const net = ledger.summary.overallNetBalance;
        const status =
            kind === "customer"
                ? net > 0 ? `${formatInr(net)} is receivable (Dr)` : net < 0 ? `${formatInr(net)} is an advance (Cr)` : "your account is settled"
                : net > 0 ? `${formatInr(net)} is payable to you (Cr)` : net < 0 ? `${formatInr(-net)} has been paid to you in advance (Dr)` : "your account is settled";
        const message = `Dear ${c.name}, please find your account statement attached. Net balance: ${status}.`;
        setStatementBusy(true);
        const loading = toast.loading("Preparing statement…");
        try {
            const outcome = await shareStatementOnWhatsApp({
                kind,
                customerId: c._id,
                customerName: c.name,
                mobile: c.mobile,
                range: statementRange,
                message,
            });
            toast.success(outcome === "shared" ? "Statement ready to share." : "Statement downloaded. Attach it in WhatsApp.", { id: loading });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't share the statement.", { id: loading });
        } finally {
            setStatementBusy(false);
        }
    };

    // ── party CRUD ──────────────────────────────────────────────────
    const handleCreateNewParty = () => {
        // No company name yet -> explain instead of opening the form (the API refuses too).
        if (companyLoaded && !companyError && !companySettings.companyName.trim()) {
            setShowCompanyRequired(true);
            return;
        }
        setName(""); setAddress(""); setCity(""); setState(""); setPincode("");
        setGstin(""); setMobile(""); setEmail(""); setOpeningBalance(""); setBalanceType(kind === "supplier" ? "credit" : "debit");
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
        const data: PartyFormData = { name, address, city, state, pincode, gstin, mobile, email, openingBalance: Number(openingBalance) || 0, balanceType };
        if (editing) {
            if (await crud.update(editing._id, data, editing.createdAt)) {
                setModalVisible(false);
                refresh();
            }
        } else {
            const createdId = await crud.create(data);
            if (createdId) {
                setModalVisible(false);
                loadParties(1);
                selectParty(createdId);
            }
        }
    };

    const handleDelete = async () => {
        const id = selectedId;
        setDeleteOpen(false);
        if (!id) return;
        if (await crud.remove(id)) {
            toast.success(`Successfully deleted ${cfg.singular}`);
            goBack();
            loadParties(1);
        }
    };

    // ── render ──────────────────────────────────────────────────────
    const entries = ledger?.entries ?? [];
    const hasMoreEntries = ledger ? ledger.pagination.currentPage < ledger.pagination.totalPages : false;
    const filtersActive = useMemo(() => !filtersAreDefault(appliedFilters), [appliedFilters]);
    // Running balance is only correct for the unfiltered list, loaded from the top.
    const balanceAvailable = !filtersActive;
    const balances = useMemo(
        () => (showBalance && balanceAvailable && ledger ? runningBalances(ledger.entries, ledger.summary.overallNetBalance) : null),
        [showBalance, balanceAvailable, ledger]
    );

    return (
        <div className="-mx-3 -mb-3 md:-mt-3">
            <CompanyProfileRequiredDialog
                open={showCompanyRequired}
                action={`add ${cfg.plural.toLowerCase()}`}
                onClose={() => setShowCompanyRequired(false)}
            />
            <CompanySetupNotice className="mx-3 mb-3" />

            {/* Fills the content column (right of the sidebar). 3rem = the top tab bar; on mobile the menu button row is 4.25rem more. */}
            <div className="flex h-[calc(100dvh-7.5rem)] min-h-[480px] overflow-hidden border-y border-(--ledger-line) bg-(--ledger-surface) md:h-[calc(100dvh-3rem)]">
                {/* LEFT: party list (full screen on mobile until one is chosen) */}
                <section className={`${selectedId ? "hidden md:flex" : "flex"} w-full flex-col md:w-[38%] md:max-w-md md:border-r md:border-(--ledger-line)`}>
                    <PartyListPanel
                        kind={kind}
                        parties={parties}
                        total={partiesTotal}
                        isLoading={partiesStatus === "loading"}
                        error={partiesError}
                        hasMore={partiesPage < partiesTotalPages}
                        selectedId={selectedId}
                        onSelect={selectParty}
                        onSearch={setSearch}
                        onLoadMore={() => loadParties(partiesPage + 1)}
                        onRetry={() => loadParties(1)}
                        onAdd={handleCreateNewParty}
                    />
                </section>

                {/* RIGHT: ledger */}
                <section className={`${selectedId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
                    {!selectedId ? (
                        <NoCustomerSelected noun={cfg.noun} docs={cfg.docPlural} />
                    ) : (
                        <>
                            <div className="p-3 pb-0">
                                <LedgerHeader
                                    kind={kind}
                                    name={ledger?.customer.name ?? parties.find((p) => p._id === selectedId)?.name ?? ""}
                                    mobile={ledger?.customer.mobile ?? parties.find((p) => p._id === selectedId)?.mobile}
                                    gstin={ledger?.customer.gstin}
                                    city={ledger?.customer.city}
                                    netBalance={ledger?.summary.overallNetBalance ?? parties.find((p) => p._id === selectedId)?.netBalance ?? 0}
                                    lastEntryDate={!filtersActive ? ledger?.entries[0]?.date : undefined}
                                    onBack={goBack}
                                    onEdit={onEdit}
                                    onDelete={() => setDeleteOpen(true)}
                                    onDownloadStatement={handleDownloadStatement}
                                    onShareStatement={handleShareStatement}
                                    onSendReminder={handleSendReminder}
                                    onPayNow={() => openPaymentDialog(dirDecrease)}
                                    onAddContract={() => openContractDialog()}
                                    statementBusy={statementBusy}
                                />
                            </div>

                            <LedgerToolbar
                                kind={kind}
                                value={filters}
                                active={filtersActive}
                                onChange={setFilters}
                                showBalance={showBalance}
                                balanceAvailable={balanceAvailable}
                                onShowBalanceChange={setShowBalance}
                            />

                            {ledger && <LedgerSummaryChips summary={ledger.summary} kind={kind} />}
                            {ledger && <LedgerAgeing ageing={ledger.ageing} docPlural={cfg.docPlural} />}

                            <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
                                {ledgerError && !ledger ? (
                                    <ApiErrorState error={ledgerError} onRetry={refresh} className="m-3" />
                                ) : ledgerStatus === "loading" && !ledger ? (
                                    <LedgerSkeleton />
                                ) : ledger && entries.length === 0 ? (
                                    <NoLedgerEntries filtered={filtersActive} onClear={() => setFilters(DEFAULT_LEDGER_FILTERS)} />
                                ) : (
                                    <LedgerEntryList
                                        kind={kind}
                                        entries={entries}
                                        openId={openEntry?.id ?? null}
                                        balances={balances}
                                        hasMore={hasMoreEntries}
                                        onOpen={setOpenEntry}
                                    />
                                )}
                                {hasMoreEntries && (
                                    <div className="p-3 text-center">
                                        <Button size="sm" variant="outline" onClick={loadMoreEntries} isLoading={ledgerStatus === "loading"}>
                                            Load more entries
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 border-t border-(--ledger-line) bg-(--ledger-card) p-3">
                                <button
                                    type="button"
                                    disabled={!ledger}
                                    onClick={() => openPaymentDialog(dirIncrease)}
                                    className={`h-11 rounded-xl text-sm font-semibold transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 ${cfg.increase.softText}`}
                                >
                                    {cfg.increase.label}
                                </button>
                                <button
                                    type="button"
                                    disabled={!ledger}
                                    onClick={() => openPaymentDialog(dirDecrease)}
                                    className={`h-11 rounded-xl text-sm font-semibold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${cfg.decrease.solid}`}
                                >
                                    {cfg.decrease.label}
                                </button>
                            </div>
                        </>
                    )}
                </section>
            </div>

            <LedgerEntryDrawer
                entry={openEntry}
                billStatus={
                    (openEntry?.billId ?? openEntry?.contractId) ? ledger?.billStatuses[(openEntry.billId ?? openEntry.contractId) as string] : undefined
                }
                onClose={() => setOpenEntry(null)}
                onEdit={(entry) => openPaymentDialog(entry.source === "adjustment" ? dirIncrease : dirDecrease, entry)}
                onDelete={askDeletePayment}
                onRecordForBill={(docId) => openPaymentDialog(dirDecrease, null, docId)}
                onEditContract={openContractDialog}
                onDeleteContract={askDeleteContract}
            />

            {paymentDialog && ledger && selectedId && (
                <RecordPaymentDialog
                    key={paymentDialog.key}
                    kind={kind}
                    partyId={selectedId}
                    partyName={ledger.customer.name}
                    netBalance={ledger.summary.overallNetBalance}
                    billStatuses={ledger.billStatuses}
                    direction={paymentDialog.direction}
                    editing={paymentDialog.editing}
                    presetBillId={paymentDialog.presetBillId}
                    onClose={() => setPaymentDialog(null)}
                    onSaved={handlePaymentSaved}
                />
            )}

            {contractDialog && ledger && selectedId && (
                <ContractDialog
                    key={contractDialog.key}
                    supplierId={selectedId}
                    supplierName={ledger.customer.name}
                    editing={contractDialog.editing}
                    onClose={() => setContractDialog(null)}
                    onSaved={handleContractSaved}
                />
            )}

            <AlertDialog open={contractToDelete !== null} onOpenChange={(open) => !open && setContractToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete contract {contractToDelete?.refNo}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {contractToDelete ? `${formatInr(contractToDelete.amount)} payable and its advance will be removed. ` : ""}
                            A contract with payments recorded against it cannot be deleted. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteContract} className="bg-red-600 hover:bg-red-700 text-white">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={paymentToDelete !== null} onOpenChange={(open) => !open && setPaymentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this {paymentToDelete?.source === "adjustment" ? "entry" : "payment"}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {paymentToDelete ? `${formatInr(paymentToDelete.amount)} will be removed. ` : ""}
                            {`The balance and the paid / unpaid status of the linked ${doc} are recalculated. This cannot be undone.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePayment} className="bg-red-600 hover:bg-red-700 text-white">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <EditOrCreateNewModalWrapper
                title={editing ? `Edit ${cfg.singular}` : `Create ${cfg.singular}`}
                isVisible={isModalVisible}
                onClose={() => setModalVisible(false)}
                onSave={handleSave}
                size="large"
            >
                <div className="form-group mb-5">
                    <FormInput label={`Company / ${cfg.singular} Name`} value={name} onChange={(e) => setName(e.target.value)} required={true} placeholder={`${cfg.singular} Name`} />
                </div>
                <div className="form-group mb-5">
                    <FormTextarea
                        label='Address'
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required={false}
                        className="w-full"
                        placeholder={`Enter ${cfg.noun} address (optional)`}
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
                        labels={kind === "supplier" ? SUPPLIER_BALANCE_LABELS : CUSTOMER_BALANCE_LABELS}
                    />
                </div>
            </EditOrCreateNewModalWrapper>

            <AlertDialog open={isDeleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the {cfg.noun}.
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
