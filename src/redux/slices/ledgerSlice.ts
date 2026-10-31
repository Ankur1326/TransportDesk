import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { getApiErrorInfo, type ApiErrorInfo } from "@/lib/api/errors";
import type { BalanceType } from "@/lib/opening-balance";
import { PARTY_CONFIG, type PartyKind } from "@/lib/ledger/party-kind";
import type { Ageing } from "@/lib/ledger/ageing";
import type { Allocation } from "@/lib/ledger/allocate";
import type { PaymentMode } from "@/lib/ledger/payment-modes";
import type {
  BillStatusInfo,
  LedgerEntry,
  LedgerSummary,
  LedgerTypeFilter,
} from "@/lib/ledger/build-ledger";

export interface PartySummary {
  _id: string;
  name: string;
  mobile: string | null;
  gstin: string;
  netBalance: number;
}

export interface LedgerCustomerInfo {
  _id: string;
  name: string;
  openingBalance: number;
  balanceType: BalanceType;
  createdAt: string;
  mobile: string | null;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  email: string;
}

export interface LedgerPagination {
  currentPage: number;
  itemsPerPage: number;
  totalEntries: number;
  totalPages: number;
}

export interface LedgerData {
  customer: LedgerCustomerInfo;
  summary: LedgerSummary;
  entries: LedgerEntry[];
  billStatuses: Record<string, BillStatusInfo>;
  ageing: Ageing;
  pagination: LedgerPagination;
}

export interface LedgerFilterState {
  from: string;
  to: string;
  type: LedgerTypeFilter;
  search: string;
  includeUnbilled: boolean;
}

export const DEFAULT_LEDGER_FILTERS: LedgerFilterState = {
  from: "",
  to: "",
  type: "all",
  search: "",
  includeUnbilled: true,
};

type Status = "idle" | "loading" | "succeeded" | "failed";

interface LedgerState {
  parties: PartySummary[];
  partiesTotal: number;
  partiesPage: number;
  partiesTotalPages: number;
  partiesStatus: Status;
  partiesError: ApiErrorInfo | null;
  partiesRequestId: string | null;

  ledger: LedgerData | null;
  ledgerStatus: Status;
  ledgerError: ApiErrorInfo | null;
  ledgerRequestId: string | null;
}

const initialState: LedgerState = {
  parties: [],
  partiesTotal: 0,
  partiesPage: 1,
  partiesTotalPages: 1,
  partiesStatus: "idle",
  partiesError: null,
  partiesRequestId: null,

  ledger: null,
  ledgerStatus: "idle",
  ledgerError: null,
  ledgerRequestId: null,
};

export const PARTIES_PER_PAGE = 30;
export const ENTRIES_PER_PAGE = 50;

/** The two summary endpoints name their list differently; this is the common shape. */
interface SummaryResponse {
  parties: PartySummary[];
  total: number;
  currentPage: number;
  totalPages: number;
}

interface RawSummary {
  customers?: PartySummary[];
  totalCustomers?: number;
  suppliers?: PartySummary[];
  totalSuppliers?: number;
  currentPage: number;
  totalPages: number;
}

export const fetchPartySummaries = createAsyncThunk<
  SummaryResponse,
  { kind: PartyKind; search: string; currentPage: number; includeUnbilled?: boolean; keepCurrent?: boolean },
  { rejectValue: ApiErrorInfo }
>("ledger/fetchPartySummaries", async ({ kind, search, currentPage, includeUnbilled = true }, { rejectWithValue }) => {
  try {
    const res = await axios.get<{ data: RawSummary }>(`${PARTY_CONFIG[kind].apiBase}/summary`, {
      params: {
        search,
        currentPage,
        itemsPerPage: PARTIES_PER_PAGE,
        ...(kind === "customer" ? { includeUnbilled } : {}),
      },
    });
    const d = res.data.data;
    return {
      parties: (kind === "customer" ? d.customers : d.suppliers) ?? [],
      total: (kind === "customer" ? d.totalCustomers : d.totalSuppliers) ?? 0,
      currentPage: d.currentPage,
      totalPages: d.totalPages,
    };
  } catch (error) {
    return rejectWithValue(getApiErrorInfo(error, `Couldn't load your ${PARTY_CONFIG[kind].plural.toLowerCase()}.`));
  }
});

export const fetchLedger = createAsyncThunk<
  LedgerData,
  // keepCurrent: refetch in place (after a payment) instead of blanking the screen first.
  { kind: PartyKind; id: string; filters: LedgerFilterState; currentPage: number; keepCurrent?: boolean },
  { rejectValue: ApiErrorInfo }
>("ledger/fetchLedger", async ({ kind, id, filters, currentPage }, { rejectWithValue }) => {
  try {
    const res = await axios.get<{ data: LedgerData }>(`${PARTY_CONFIG[kind].apiBase}/ledger/${encodeURIComponent(id)}`, {
      params: {
        from: filters.from || undefined,
        to: filters.to || undefined,
        type: filters.type,
        search: filters.search || undefined,
        ...(kind === "customer" ? { includeUnbilled: filters.includeUnbilled } : {}),
        currentPage,
        itemsPerPage: ENTRIES_PER_PAGE,
      },
    });
    return res.data.data;
  } catch (error) {
    return rejectWithValue(getApiErrorInfo(error, "Couldn't load this ledger."));
  }
});

// ─── payments (record / edit / delete) ──────────────────────────────────────
// These only talk to the API. The page refetches the ledger and the customer
// list afterwards, so balances never come from client-side maths.

export interface PaymentFields {
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  mode: PaymentMode;
  reference: string;
  remark: string;
}

interface PaymentResult {
  message: string;
}

const paymentError = (error: unknown, fallback: string): string => getApiErrorInfo(error, fallback).message;

/** Customer payments live under /api/admin/payment, supplier ones under /api/admin/supplier/payment. */
const paymentPath = (kind: PartyKind, action: "create" | "update" | "delete" | "allocate"): string =>
  kind === "customer" ? `/api/admin/payment/${action}` : `/api/admin/supplier/payment/${action}`;

/** Suppliers link a payment to a contract; the shared dialog still calls it `billId`. */
function paymentBody<T extends { billId?: string | null }>(kind: PartyKind, input: T): Record<string, unknown> {
  const { billId, ...rest } = input;
  return kind === "customer" ? { ...rest, billId } : { ...rest, contractId: billId };
}

/** "Received (Credit)" or a manual "Receivable (Debit)", optionally linked to one bill. */
export const createPayment = createAsyncThunk<
  PaymentResult,
  PaymentFields & {
    kind: PartyKind;
    partyId: string;
    direction: "received" | "receivable_adjustment" | "paid" | "payable_adjustment";
    billId?: string | null;
  },
  { rejectValue: string }
>("ledger/createPayment", async ({ kind, ...input }, { rejectWithValue }) => {
  try {
    const res = await axios.post<{ message: string }>(paymentPath(kind, "create"), paymentBody(kind, input));
    return { message: res.data.message };
  } catch (error) {
    return rejectWithValue(paymentError(error, "Couldn't record this payment."));
  }
});

/** One received amount split over open invoices, oldest first (decided on the server). */
export const allocatePayment = createAsyncThunk<
  PaymentResult & { allocations: Allocation[]; unapplied: number },
  PaymentFields & { kind: PartyKind; partyId: string },
  { rejectValue: string }
>("ledger/allocatePayment", async ({ kind, ...input }, { rejectWithValue }) => {
  try {
    const res = await axios.post<{
      message: string;
      data: { allocations: Allocation[]; unapplied: number };
    }>(paymentPath(kind, "allocate"), input);
    return { message: res.data.message, ...res.data.data };
  } catch (error) {
    return rejectWithValue(paymentError(error, "Couldn't record this payment."));
  }
});

export const updatePayment = createAsyncThunk<
  PaymentResult,
  PaymentFields & { kind: PartyKind; _id: string; billId?: string | null },
  { rejectValue: string }
>("ledger/updatePayment", async ({ kind, ...input }, { rejectWithValue }) => {
  try {
    const res = await axios.put<{ message: string }>(paymentPath(kind, "update"), paymentBody(kind, input));
    return { message: res.data.message };
  } catch (error) {
    return rejectWithValue(paymentError(error, "Couldn't update this payment."));
  }
});

export const deletePayment = createAsyncThunk<PaymentResult, { kind: PartyKind; _id: string }, { rejectValue: string }>(
  "ledger/deletePayment",
  async ({ kind, _id }, { rejectWithValue }) => {
    try {
      const res = await axios.delete<{ message: string }>(paymentPath(kind, "delete"), { data: { _id } });
      return { message: res.data.message };
    } catch (error) {
      return rejectWithValue(paymentError(error, "Couldn't delete this payment."));
    }
  }
);

// ─── lorry hire contracts (suppliers) ───────────────────────────────────────
export interface ContractFields {
  contractNo: string;
  /** YYYY-MM-DD */
  date: string;
  vehicleNo: string;
  consignmentNos: string[];
  hireAmount: number;
  otherCharges: number;
  deductions: number;
  tdsAmount: number;
  advancePaid: number;
  advanceDate: string;
  advanceVia: PaymentMode;
  remark: string;
}

export const createContract = createAsyncThunk<PaymentResult, ContractFields & { supplierId: string }, { rejectValue: string }>(
  "ledger/createContract",
  async (input, { rejectWithValue }) => {
    try {
      const res = await axios.post<{ message: string }>("/api/admin/supplier/contract/create", input);
      return { message: res.data.message };
    } catch (error) {
      return rejectWithValue(paymentError(error, "Couldn't add this contract."));
    }
  }
);

export const updateContract = createAsyncThunk<PaymentResult, ContractFields & { _id: string }, { rejectValue: string }>(
  "ledger/updateContract",
  async (input, { rejectWithValue }) => {
    try {
      const res = await axios.put<{ message: string }>("/api/admin/supplier/contract/update", input);
      return { message: res.data.message };
    } catch (error) {
      return rejectWithValue(paymentError(error, "Couldn't update this contract."));
    }
  }
);

export const deleteContract = createAsyncThunk<PaymentResult, { _id: string }, { rejectValue: string }>(
  "ledger/deleteContract",
  async ({ _id }, { rejectWithValue }) => {
    try {
      const res = await axios.delete<{ message: string }>("/api/admin/supplier/contract/delete", { data: { _id } });
      return { message: res.data.message };
    } catch (error) {
      return rejectWithValue(paymentError(error, "Couldn't delete this contract."));
    }
  }
);

const ledgerSlice = createSlice({
  name: "ledger",
  initialState,
  reducers: {
    clearLedger(state) {
      state.ledger = null;
      state.ledgerStatus = "idle";
      state.ledgerError = null;
      state.ledgerRequestId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPartySummaries.pending, (state, action) => {
        state.partiesStatus = "loading";
        state.partiesError = null;
        state.partiesRequestId = action.meta.requestId;
        // A fresh search / first page replaces the list immediately.
        if (action.meta.arg.currentPage === 1 && !action.meta.arg.keepCurrent) state.parties = [];
      })
      .addCase(fetchPartySummaries.fulfilled, (state, action) => {
        if (state.partiesRequestId !== action.meta.requestId) return; // stale response
        const { parties, total, currentPage, totalPages } = action.payload;
        state.parties = currentPage > 1 ? [...state.parties, ...parties] : parties;
        state.partiesTotal = total;
        state.partiesPage = currentPage;
        state.partiesTotalPages = totalPages;
        state.partiesStatus = "succeeded";
      })
      .addCase(fetchPartySummaries.rejected, (state, action) => {
        if (state.partiesRequestId !== action.meta.requestId) return;
        state.partiesStatus = "failed";
        state.partiesError = action.payload ?? null;
      })
      .addCase(fetchLedger.pending, (state, action) => {
        state.ledgerStatus = "loading";
        state.ledgerError = null;
        state.ledgerRequestId = action.meta.requestId;
        // Switching customer (or filters) must not flash the previous ledger.
        if (action.meta.arg.currentPage === 1 && !action.meta.arg.keepCurrent) state.ledger = null;
      })
      .addCase(fetchLedger.fulfilled, (state, action) => {
        if (state.ledgerRequestId !== action.meta.requestId) return;
        const incoming = action.payload;
        state.ledger =
          action.meta.arg.currentPage > 1 && state.ledger
            ? { ...incoming, entries: [...state.ledger.entries, ...incoming.entries] }
            : incoming;
        state.ledgerStatus = "succeeded";
      })
      .addCase(fetchLedger.rejected, (state, action) => {
        if (state.ledgerRequestId !== action.meta.requestId) return;
        state.ledgerStatus = "failed";
        state.ledgerError = action.payload ?? null;
      });
  },
});

export const { clearLedger } = ledgerSlice.actions;
export default ledgerSlice.reducer;
