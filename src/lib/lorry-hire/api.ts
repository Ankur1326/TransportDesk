import axios from "axios";
import type { LorryHireFormValues, LorryHirePaymentValues } from "./validations";
import type {
  ChargeKind,
  FreightPaidBy,
  GstMode,
  LorryHireLoadType,
  LorryHirePaymentKind,
  LorryHirePaymentStatus,
  LorryHireStatus,
  PaymentMode,
  RateMode,
  SupplierType,
  TdsMode,
  TdsSection,
  WeightUnit,
} from "./constants";

const BASE = "/api/admin/lorry-hires";

/** A stored contract as the API returns it (dates are ISO strings). */
export interface LorryHireRecord {
  _id: string;
  lhcNo: string;
  lhcDate: string;
  loadingDate?: string;
  expectedDeliveryDate?: string;
  transitDays: number;
  loadType: LorryHireLoadType;
  from: { location: string; state?: string };
  to: { location: string; state?: string };
  via?: string;
  supplier: {
    supplierId?: string;
    name: string;
    supplierType: SupplierType;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
    pan?: string;
    mobile?: string;
  };
  owner?: { sameAsSupplier?: boolean; name?: string; mobile?: string; pan?: string; address?: string };
  driver?: { name?: string; mobile?: string; licenseNumber?: string; licenseExpiry?: string };
  truck: {
    vehicleNumber: string;
    truckType?: string;
    capacity?: number;
    capacityUnit?: WeightUnit;
    chassisNo?: string;
    engineNo?: string;
    permitNo?: string;
    isOversize?: boolean;
  };
  insurance?: { company?: string; policyNumber?: string; validUpto?: string };
  weightUnit: WeightUnit;
  items: {
    consignmentId?: string;
    cnNo: string;
    cnDate?: string;
    from?: string;
    to?: string;
    description?: string;
    packages: number;
    actualWeight: number;
    chargedWeight: number;
  }[];
  freight: { rateMode: RateMode; rate: number; freightPaidBy: FreightPaidBy };
  charges: { chargeId: string; name: string; kind: ChargeKind; amount: number }[];
  tax: {
    gstMode: GstMode;
    gstRate: number;
    tdsMode: TdsMode;
    tdsRate: number;
    tdsSection: TdsSection;
    roundOff: boolean;
  };
  shortage: { amount: number; quantity: number; unit: WeightUnit; note?: string };
  settlement: {
    grossHire: number;
    netPayable: number;
    totalPaid: number;
    balance: number;
    paymentStatus: LorryHirePaymentStatus;
    totalPackages: number;
  };
  payments: {
    _id: string;
    kind: LorryHirePaymentKind;
    amount: number;
    date: string;
    mode: PaymentMode;
    reference?: string;
    paidTo?: string;
    remark?: string;
  }[];
  bank?: { accountHolderName?: string; bankName?: string; accountNumber?: string; ifscCode?: string; upiId?: string };
  remarks?: string;
  internalNotes?: string;
  preparedBy?: string;
  passedBy?: string;
  driverSignature?: string;
  status: LorryHireStatus;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface LorryHireListParams {
  search?: string;
  status?: LorryHireStatus;
  paymentStatus?: LorryHirePaymentStatus;
  supplierId?: string;
  vehicle?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface LorryHireListResponse {
  data: LorryHireRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface LorryHireCounts {
  all: number;
  byStatus: Record<LorryHireStatus, number>;
  byPayment: Record<LorryHirePaymentStatus, number>;
}

export async function listLorryHires(params: LorryHireListParams = {}): Promise<LorryHireListResponse> {
  const { data } = await axios.get<LorryHireListResponse>(`${BASE}/get`, { params });
  return data;
}

export async function getLorryHireCounts(): Promise<LorryHireCounts> {
  const { data } = await axios.get<Envelope<LorryHireCounts>>(`${BASE}/counts`);
  return data.data;
}

export async function getLorryHire(id: string): Promise<LorryHireRecord> {
  const { data } = await axios.get<Envelope<LorryHireRecord>>(`${BASE}/get-one/${id}`);
  return data.data;
}

export async function fetchNextLhcNo(): Promise<string> {
  const { data } = await axios.get<Envelope<{ lhcNo: string }>>(`${BASE}/next-number`);
  if (!data.data?.lhcNo) throw new Error("Server did not return an LHC number.");
  return data.data.lhcNo;
}

export async function createLorryHire(values: LorryHireFormValues): Promise<LorryHireRecord> {
  const { data } = await axios.post<Envelope<LorryHireRecord>>(`${BASE}/create`, values);
  return data.data;
}

export async function updateLorryHire(id: string, values: LorryHireFormValues): Promise<LorryHireRecord> {
  const { data } = await axios.put<Envelope<LorryHireRecord>>(`${BASE}/update/${id}`, values);
  return data.data;
}

/** The most recent contract for a truck, or null if it was never hired. */
export async function lookupVehicle(vehicle: string): Promise<Partial<LorryHireRecord> | null> {
  const { data } = await axios.get<Envelope<Partial<LorryHireRecord> | null>>(`${BASE}/lookup`, {
    params: { vehicle },
  });
  return data.data;
}

export async function setLorryHireStatus(id: string, status: LorryHireStatus, note = ""): Promise<LorryHireRecord> {
  const { data } = await axios.post<Envelope<LorryHireRecord>>(`${BASE}/${id}/status`, { status, note });
  return data.data;
}

export async function addLorryHirePayment(
  id: string,
  payment: Omit<LorryHirePaymentValues, "paymentId">
): Promise<LorryHireRecord> {
  const { data } = await axios.post<Envelope<LorryHireRecord>>(`${BASE}/${id}/payments`, payment);
  return data.data;
}

export async function removeLorryHirePayment(id: string, paymentId: string): Promise<LorryHireRecord> {
  const { data } = await axios.delete<Envelope<LorryHireRecord>>(`${BASE}/${id}/payments`, { data: { paymentId } });
  return data.data;
}
