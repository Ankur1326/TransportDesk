import axios from "axios";
import type { BillingFormValues } from "@/lib/validations/billing";
import type { ChargeLine } from "@/lib/charges";

export interface ConsignmentRecord extends BillingFormValues {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

/** Mongo can serialize dates either as a plain ISO string or as extended-JSON `{ $date: "..." }`. */
export type MongoDate = string | { $date: string } | null | undefined;

/**
 * Shape actually returned by GET /api/consignments/get — looser than
 * BillingFormValues since several fields (weights, packages, tax %) are
 * stored as free-text strings and may be partially filled on older records.
 */
export interface ConsignmentListItem {
  _id: string;
  consignmentNumber: string;
  bookingDate?: MongoDate | null;
  cnsDate?: MongoDate | null;
  eWayBillNumber?: string;
  validUpTo?: MongoDate | null;
  invoiceNumber?: string;
  invoiceDate?: MongoDate | null;
  vehicleNumber?: string;
  from?: { location?: string; branch?: string; state?: string; gstin?: string };
  to?: { location?: string; branch?: string; state?: string; gstin?: string };
  consignor?: { name?: string; city?: string; state?: string; mobile?: string; gstin?: string };
  consignee?: { name?: string; city?: string; state?: string; mobile?: string; gstin?: string };
  shipment?: {
    packages?: string;
    packing?: string;
    description?: string;
    classification?: string;
    declaredValue?: string;
    invoiceNumber?: string;
    volume?: string;
    actualWeight?: string;
    chargeWeight?: string;
  };
  segment?: string;
  loadType?: string;
  charges?: Record<string, number> & { chargeLines?: ChargeLine[] };
  tax?: { type?: string; percentage?: number | "custom"; customPercentage?: number };
  payment?: {
    type?: string;
    billingParty?: string;
    billingAccount?: string;
    status?: string;
    receivedType?: string;
    receivedMoney?: string;
    receivedDate?: string;
    UTRNumber?: string;
    mrNumber?: string;
    mrDate?: string;
  };
  insurance?: {
    required?: boolean;
    company?: string;
    policyNumber?: string;
    amount?: number;
    date?: MongoDate | null;
    riskType?: string;
  };
  remarks?: string;
  internalNotes?: string;
  specialInstructions?: string;
  createdAt?: MongoDate;
  updatedAt?: MongoDate;
}

export interface ConsignmentListParams {
  search?: string;
  paymentStatus?: string;
  segment?: string;
  page?: number;
  limit?: number;
}

export interface ConsignmentListResponse {
  success: boolean;
  message: string;
  data: ConsignmentListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
}

const BASE_URL = "/api/admin/consignments";

/** Extracts a human-readable message from an axios error, falling back to a generic one. */
export function getApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? fallback;
  }
  return fallback;
}

/** Fetch a paginated, filterable list of consignments. */
export async function listConsignments(params: ConsignmentListParams = {}): Promise<ConsignmentListResponse> {
  const { data } = await axios.get<ConsignmentListResponse>(`${BASE_URL}/get`, { params });
  return data;
}

/** Fetch a single consignment by its Mongo id. */
export async function getConsignment(id: string): Promise<ConsignmentRecord> {
  const { data } = await axios.get<ApiResponse<ConsignmentRecord>>(`${BASE_URL}/get-one/${id}`);
  return data.data as ConsignmentRecord;
}

/** Fetch a single consignment by its human-readable consignment number. */
export async function getConsignmentByNumber(consignmentNumber: string): Promise<ConsignmentRecord | null> {
  try {
    const { data } = await axios.get<ApiResponse<ConsignmentRecord>>(
      `${BASE_URL}/number/${encodeURIComponent(consignmentNumber)}`
    );
    return (data.data as ConsignmentRecord) ?? null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

/** Create a new consignment. */
export async function createConsignment(values: BillingFormValues): Promise<ConsignmentRecord> {
  const { data } = await axios.post<ApiResponse<ConsignmentRecord>>(`${BASE_URL}/create`, values);
  return data.data as ConsignmentRecord;
}

/** Replace an existing consignment's fields. */
export async function updateConsignment(id: string, values: BillingFormValues): Promise<ConsignmentRecord> {
  const { data } = await axios.put<ApiResponse<ConsignmentRecord>>(`${BASE_URL}/update/${id}`, values);
  return data.data as ConsignmentRecord;
}

/** Delete a consignment. */
export async function deleteConsignment(id: string): Promise<void> {
  await axios.delete(`${BASE_URL}/${id}`);
}