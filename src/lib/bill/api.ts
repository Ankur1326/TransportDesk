import type { FreightBillFormValues } from "@/lib/bill/validations";

import {
  listConsignments,
  getConsignment,
  type ConsignmentListItem,
  type ConsignmentRecord,
} from "@/lib/api/consignments";
import axios from "axios";
import type { PdfCacheEntry } from "@/lib/pdf-url";

export type { ConsignmentListItem, ConsignmentRecord };

export interface FreightBillRecord extends FreightBillFormValues {
  _id: string;
  totalAmount: number;
  /** Stored PDFs by variant; use freshPdfUrl() from @/lib/pdf-url to check it is current. */
  pdfCache?: Record<string, PdfCacheEntry>;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
}

const BILLS_BASE_URL = "/api/admin/bills";

/**
 * listConsignments() hits GET /api/admin/consignments/get, which supports
 * `paymentStatus` as an exact match, not an "exclude" filter — so instead of
 * asking the backend to exclude Paid, we filter it out client-side after
 * fetching. That also protects against older records where payment.status
 * might be blank/undefined.
 */
export interface SearchEligibleOptions {
  partyType?: "Consignor" | "Consignee";
  partyName?: string;
  excludeBilled?: boolean;
  limit?: number;
}

export async function searchEligibleConsignments(query: string, opts: SearchEligibleOptions = {}): Promise<ConsignmentListItem[]> {
  const params: any = { search: query.trim() || undefined, limit: opts.limit || 20 };
  if (opts.partyType) params.partyType = opts.partyType;
  if (opts.partyName) params.partyName = opts.partyName;
  if (opts.excludeBilled) params.excludeBilled = "true";

  const { data } = await listConsignments(params);
  return data.filter((c) => c.payment?.status !== "Paid");
}

/**
 * The list endpoint returns a slimmer shape (no consignor/consignee address,
 * loosely-typed charges) — so once a CNS is actually picked to go on the
 * bill, fetch the FULL record via GET /api/admin/consignments/get-one/:id
 * for accurate address/GSTIN/charges before adding the row.
 */
export async function getConsignmentForBill(id: string): Promise<ConsignmentRecord> {
  return getConsignment(id);
}

/** Authoritative next bill number from the DB (fiscal-year aware, resets 1 April). */
export async function fetchNextBillNumberFromServer(): Promise<string> {
  const { data } = await axios.get<ApiResponse<{ billNo: string }>>(`${BILLS_BASE_URL}/next-number`);
  const billNo = data.data?.billNo;
  if (!billNo) throw new Error("Server did not return a bill number.");
  return billNo;
}

export async function createFreightBill(values: FreightBillFormValues): Promise<FreightBillRecord> {
  const { data } = await axios.post<ApiResponse<FreightBillRecord>>(`${BILLS_BASE_URL}/create`, values);
  return data.data as FreightBillRecord;
}

export async function updateFreightBill(id: string, values: FreightBillFormValues): Promise<FreightBillRecord> {
  const { data } = await axios.put<ApiResponse<FreightBillRecord>>(`${BILLS_BASE_URL}/update/${id}`, values);
  return data.data as FreightBillRecord;
}

export async function getFreightBill(id: string): Promise<FreightBillRecord> {
  const { data } = await axios.get<ApiResponse<FreightBillRecord>>(`${BILLS_BASE_URL}/get-one/${id}`);
  return data.data as FreightBillRecord;
}

export async function deleteFreightBill(id: string): Promise<void> {
  await axios.delete(`${BILLS_BASE_URL}/${id}`);
}

export interface FreightBillListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface FreightBillListResponse {
  success: boolean;
  message: string;
  data: FreightBillRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function listFreightBills(params: FreightBillListParams = {}): Promise<FreightBillListResponse> {
  const { data } = await axios.get<FreightBillListResponse>(`${BILLS_BASE_URL}/get`, { params });
  return data;
}

/** A saved customer (company) as returned by /api/admin/customer/get. */
export interface CustomerOption {
  _id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  mobile?: string | null;
  email?: string;
}

/** Search saved customers by name, city, GSTIN or mobile. */
export async function searchCustomers(search: string, limit = 15): Promise<CustomerOption[]> {
  const { data } = await axios.get<{ data?: { customers?: CustomerOption[] } }>("/api/admin/customer/get", {
    params: { search: search.trim() || undefined, itemsPerPage: limit, currentPage: 1 },
  });
  return data?.data?.customers ?? [];
}

/**
 * Every unbilled, unpaid LR where this party is the consignor OR the consignee.
 */
export async function listPartyConsignments(partyName: string): Promise<ConsignmentListItem[]> {
  const { data } = await listConsignments({ partyType: "Any", partyName, excludeBilled: "true", limit: 100 });
  return data.filter((c) => c.payment?.status !== "Paid");
}
