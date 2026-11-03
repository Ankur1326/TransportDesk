"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/Input";
import { getDocumentStatus, type DocumentStatus } from "@/lib/document-status";
import {
  VEHICLE_DOCUMENT_KEYS,
  type DriverMaster,
  type FleetDocument,
  type FleetExpiringDocument,
  type OtherFleetDocument,
  type VehicleDocumentKey,
  type VehicleMaster,
} from "@/lib/fleet-types";
import type { DriverSummary, VehicleSummary } from "@/lib/lorry-hire/fleet-reports";

type Kind = "vehicles" | "drivers";
type RecordRow = VehicleMaster | DriverMaster;
type VehicleDraft = Omit<VehicleMaster, "_id" | "createdAt" | "updatedAt" | "year"> & { _id?: string; year: string };
type DriverDraft = Omit<DriverMaster, "_id" | "createdAt" | "updatedAt"> & { _id?: string };
type Draft = { kind: "vehicle"; data: VehicleDraft } | { kind: "driver"; data: DriverDraft };
type DetailStats = VehicleSummary | DriverSummary | null;
type Detail = { data: RecordRow; stats: DetailStats };

const DOCUMENT_LABELS: Record<VehicleDocumentKey, string> = {
  insurance: "Insurance",
  fitness: "Fitness",
  permit: "Permit",
  puc: "PUC",
  roadTax: "Road tax",
  nationalPermit: "National permit",
};
const DEFAULT_DOCUMENT: FleetDocument = { number: "", issuedOn: "", expiresOn: "", fileUrl: "", filePublicId: "" };

function emptyVehicleDraft(): VehicleDraft {
  return {
    registrationNumber: "",
    ownership: "Market",
    ownerSupplierId: "",
    truckType: "",
    capacity: 0,
    capacityUnit: "MTS",
    make: "",
    model: "",
    year: "",
    chassisNo: "",
    engineNo: "",
    status: "Active",
    defaultDriverId: "",
    notes: "",
    documents: Object.fromEntries(VEHICLE_DOCUMENT_KEYS.map((key) => [key, { ...DEFAULT_DOCUMENT }])) as Record<VehicleDocumentKey, FleetDocument>,
    otherDocuments: [],
  };
}

function emptyDriverDraft(): DriverDraft {
  return {
    name: "",
    mobile: "",
    licenseNumber: "",
    licenseClass: "",
    licenseExpiry: "",
    address: "",
    status: "Active",
    notes: "",
  };
}

function day(value?: string): string {
  return value ? value.slice(0, 10) : "";
}

function badgeClass(status: DocumentStatus | "Active" | "Inactive"): string {
  if (status === "Expired" || status === "Inactive") return "bg-red-100 text-red-800";
  if (status === "Expiring") return "bg-amber-100 text-amber-900";
  if (status === "Valid" || status === "Active") return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-700";
}

function Badge({ children, status }: { children: ReactNode; status: DocumentStatus | "Active" | "Inactive" }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass(status)}`}>{children}</span>;
}

async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json() as { success?: boolean; message?: string; data?: T };
  if (!response.ok || !body.success) throw new Error(body.message || "The request failed.");
  return body.data as T;
}

function expiryState(row: RecordRow, kind: Kind, warnDays: number): DocumentStatus | "Valid" {
  if (kind === "drivers") {
    const driver = row as DriverMaster;
    return getDocumentStatus(driver.licenseExpiry, new Date(), warnDays);
  }
  const vehicle = row as VehicleMaster;
  const statuses = [
    ...VEHICLE_DOCUMENT_KEYS.map((key) => getDocumentStatus(vehicle.documents?.[key]?.expiresOn, new Date(), warnDays)),
    ...(vehicle.otherDocuments ?? []).map((document) => getDocumentStatus(document.expiresOn, new Date(), warnDays)),
  ];
  if (statuses.includes("Expired")) return "Expired";
  if (statuses.includes("Expiring")) return "Expiring";
  if (statuses.includes("Valid")) return "Valid";
  return "Missing";
}

export default function FleetMasterPage({ kind }: { kind: Kind }) {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [expiring, setExpiring] = useState<FleetExpiringDocument[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<{ _id: string; name: string }[]>([]);
  const [driverOptions, setDriverOptions] = useState<{ _id: string; name: string }[]>([]);
  const [warnDays, setWarnDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [ownership, setOwnership] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expiryFilter, setExpiryFilter] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [otherDocumentName, setOtherDocumentName] = useState("");
  const [otherDocumentExpiry, setOtherDocumentExpiry] = useState("");

  const endpoint = `/api/admin/fleet/${kind}`;
  const fetchData = useCallback(async () => {
      const [masterResponse, expiryResponse, supplierResponse, driverResponse] = await Promise.all([
        fetch(endpoint, { cache: "no-store" }),
        fetch("/api/admin/fleet/expiring", { cache: "no-store" }),
        kind === "vehicles" ? fetch("/api/admin/supplier/get?currentPage=1&itemsPerPage=100", { cache: "no-store" }) : Promise.resolve(null),
        kind === "vehicles" ? fetch("/api/admin/fleet/drivers", { cache: "no-store" }) : Promise.resolve(null),
      ]);
      const [masterRows, expiryData] = await Promise.all([
        readResponse<RecordRow[]>(masterResponse),
        readResponse<{ documents: FleetExpiringDocument[]; warnDays: number }>(expiryResponse),
      ]);
      let suppliers: { _id: string; name: string }[] = [];
      let drivers: { _id: string; name: string }[] = [];
      if (supplierResponse && driverResponse) {
        const [supplierData, driverRows] = await Promise.all([
          readResponse<{ suppliers: { _id: string; name: string }[] }>(supplierResponse),
          readResponse<{ _id: string; name: string }[]>(driverResponse),
        ]);
        suppliers = supplierData.suppliers;
        drivers = driverRows;
      }
      return { masterRows, expiryData, suppliers, drivers };
  }, [endpoint, kind]);

  const applyData = useCallback((data: Awaited<ReturnType<typeof fetchData>>) => {
    setRecords(data.masterRows);
    setExpiring(data.expiryData.documents);
    setWarnDays(data.expiryData.warnDays);
    setSupplierOptions(data.suppliers);
    setDriverOptions(data.drivers);
  }, []);

  const loadData = useCallback(async () => {
    try {
      applyData(await fetchData());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load fleet records.");
    } finally {
      setLoading(false);
    }
  }, [applyData, fetchData]);

  useEffect(() => {
    let active = true;
    fetchData()
      .then((data) => {
        if (active) applyData(data);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load fleet records.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyData, fetchData]);

  const filtered = useMemo(() => records.filter((row) => {
    const state = expiryState(row, kind, warnDays);
    const fields = kind === "vehicles"
      ? (() => {
          const vehicle = row as VehicleMaster;
          return [vehicle.registrationNumber, vehicle.truckType, vehicle.make, vehicle.model, vehicle.chassisNo];
        })()
      : (() => {
          const driver = row as DriverMaster;
          return [driver.name, driver.mobile, driver.licenseNumber];
        })();
    return (
      fields.some((field) => String(field ?? "").toLowerCase().includes(search.trim().toLowerCase())) &&
      (!statusFilter || row.status === statusFilter) &&
      (!expiryFilter || state === expiryFilter) &&
      (kind !== "vehicles" || !ownership || (row as VehicleMaster).ownership === ownership)
    );
  }), [records, kind, search, statusFilter, expiryFilter, ownership, warnDays]);

  function beginCreate() {
    setError("");
    setPendingFiles({});
    setDraft(kind === "vehicles"
      ? { kind: "vehicle", data: emptyVehicleDraft() }
      : { kind: "driver", data: emptyDriverDraft() });
  }

  function beginEdit(row: RecordRow) {
    setError("");
    setPendingFiles({});
    if ("registrationNumber" in row) {
      setDraft({
        kind: "vehicle",
        data: {
          _id: row._id,
          registrationNumber: row.registrationNumber,
          ownership: row.ownership,
          ownerSupplierId: row.ownerSupplierId ?? "",
          truckType: row.truckType,
          capacity: row.capacity,
          capacityUnit: row.capacityUnit,
          make: row.make,
          model: row.model,
          year: row.year ? String(row.year) : "",
          chassisNo: row.chassisNo,
          engineNo: row.engineNo,
          status: row.status,
          defaultDriverId: row.defaultDriverId ?? "",
          notes: row.notes,
          documents: Object.fromEntries(VEHICLE_DOCUMENT_KEYS.map((key) => [key, {
            ...DEFAULT_DOCUMENT,
            ...row.documents?.[key],
            issuedOn: day(row.documents?.[key]?.issuedOn),
            expiresOn: day(row.documents?.[key]?.expiresOn),
          }])) as Record<VehicleDocumentKey, FleetDocument>,
          otherDocuments: (row.otherDocuments ?? []).map((document) => ({
            ...document,
            issuedOn: day(document.issuedOn),
            expiresOn: day(document.expiresOn),
          })),
        },
      });
    } else {
      setDraft({
        kind: "driver",
        data: {
          _id: row._id,
          name: row.name,
          mobile: row.mobile,
          licenseNumber: row.licenseNumber,
          licenseClass: row.licenseClass,
          licenseExpiry: day(row.licenseExpiry),
          address: row.address,
          status: row.status,
          notes: row.notes,
        },
      });
    }
  }

  async function showDetails(row: RecordRow) {
    setDetailLoading(true);
    setDetailError("");
    setDetail({ data: row, stats: null });
    try {
      const detailEndpoint = `${endpoint}/${row._id}`;
      const result = await readResponse<{ record: RecordRow; stats: DetailStats }>(
        await fetch(detailEndpoint, { cache: "no-store" })
      );
      setDetail({ data: result.record, stats: result.stats });
    } catch (detailError) {
      setDetailError(detailError instanceof Error ? detailError.message : "Unable to load details.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function uploadPendingFiles(record: VehicleMaster) {
    const uploads: Promise<void>[] = [];
    for (const [fileKey, file] of Object.entries(pendingFiles)) {
      const formData = new FormData();
      formData.set("file", file);
      if (fileKey.startsWith("otherDocuments.")) {
        const index = Number(fileKey.split(".")[1]);
        const document = record.otherDocuments[index];
        if (!document?._id) throw new Error(`Could not resolve other document "${document?.name ?? ""}". Save and retry its upload.`);
        formData.set("documentKey", "otherDocuments");
        formData.set("documentId", document._id);
      } else {
        formData.set("documentKey", fileKey);
      }
      uploads.push(
        fetch(`/api/admin/fleet/vehicles/${record._id}/documents`, { method: "POST", body: formData })
          .then((response) => readResponse(response))
          .then(() => undefined)
      );
    }
    await Promise.all(uploads);
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      if (draft.kind === "vehicle") {
        const { year, _id, ...values } = draft.data;
        const payload = { ...values, year: year ? Number(year) : undefined };
        const response = await fetch(_id ? `${endpoint}/${_id}` : endpoint, {
          method: _id ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const saved = await readResponse<VehicleMaster>(response);
        setDraft({ kind: "vehicle", data: { ...draft.data, _id: saved._id } });
        await uploadPendingFiles(saved);
      } else {
        const { _id, ...driverDraft } = draft.data;
        const response = await fetch(_id ? `${endpoint}/${_id}` : endpoint, {
          method: _id ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(driverDraft),
        });
        await readResponse<DriverMaster>(response);
      }
      setDraft(null);
      setPendingFiles({});
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this record.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(row: RecordRow) {
    if (row.status === "Inactive") return;
    setError("");
    setError("");
    try {
      await readResponse(await fetch(`${endpoint}/${row._id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "Inactive" }),
      }));
      await loadData();
    } catch (deactivateError) {
      setError(deactivateError instanceof Error ? deactivateError.message : "Unable to deactivate this record.");
    }
  }

  function updateVehicleField<K extends keyof VehicleDraft>(field: K, value: VehicleDraft[K]) {
    setDraft((current) => current?.kind === "vehicle"
      ? { ...current, data: { ...current.data, [field]: value } }
      : current);
  }

  function updateDriverField<K extends keyof DriverDraft>(field: K, value: DriverDraft[K]) {
    setDraft((current) => current?.kind === "driver"
      ? { ...current, data: { ...current.data, [field]: value } }
      : current);
  }

  function updateVehicleDocument(key: VehicleDocumentKey, field: keyof FleetDocument, value: string) {
    if (draft?.kind !== "vehicle") return;
    updateVehicleField("documents", {
      ...draft.data.documents,
      [key]: { ...draft.data.documents[key], [field]: value },
    });
  }

  function addOtherDocument() {
    if (draft?.kind !== "vehicle" || !otherDocumentName.trim()) return;
    updateVehicleField("otherDocuments", [
      ...draft.data.otherDocuments,
      { ...DEFAULT_DOCUMENT, name: otherDocumentName.trim(), expiresOn: otherDocumentExpiry } as OtherFleetDocument,
    ]);
    setOtherDocumentName("");
    setOtherDocumentExpiry("");
  }

  function removeOtherDocument(index: number) {
    const remainingFiles: Record<string, File> = {};
    for (const [fileKey, file] of Object.entries(pendingFiles)) {
      if (!fileKey.startsWith("otherDocuments.")) {
        remainingFiles[fileKey] = file;
        continue;
      }
      const oldIndex = Number(fileKey.split(".")[1]);
      if (oldIndex < index) remainingFiles[fileKey] = file;
      if (oldIndex > index) remainingFiles[`otherDocuments.${oldIndex - 1}`] = file;
    }
    setPendingFiles(remainingFiles);
    if (draft?.kind === "vehicle") {
      updateVehicleField("otherDocuments", draft.data.otherDocuments.filter((_, i) => i !== index));
    }
  }

  const expiringCount = expiring.length;

  return (
    <div className="space-y-4 p-1">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{kind === "vehicles" ? "Vehicle master" : "Driver master"}</h1>
          <p className="text-sm text-neutral-500">Manage company fleet records and document validity.</p>
        </div>
        <Button type="button" onClick={beginCreate}>Add {kind === "vehicles" ? "vehicle" : "driver"}</Button>
      </header>

      {!!expiringCount && (
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-4" aria-label="Expiring documents">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-amber-950">Expiring documents</h2>
              <p className="text-sm text-amber-900">{expiringCount} expired or expiring fleet document{expiringCount === 1 ? "" : "s"}.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setExpiryFilter("")}>Show all</Button>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {expiring.slice(0, 6).map((document, index) => (
              <li key={`${document.entityId}-${document.documentName}-${index}`} className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-white/80 px-3 py-2 text-sm">
                <span className="min-w-0 truncate">{document.entityName} · {document.documentName}</span>
                <Badge status={document.status}>{document.status} · {day(document.expiresOn)}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

      <section className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={kind === "vehicles" ? "Registration, type, make" : "Name, mobile, licence"} />
        {kind === "vehicles" && (
          <label className="text-xs font-semibold uppercase text-neutral-600">
            Ownership
            <select className="mt-1 h-10 w-full border border-neutral-300 bg-white px-2 text-sm normal-case" value={ownership} onChange={(event) => setOwnership(event.target.value)}>
              <option value="">All ownership</option><option value="Own">Own</option><option value="Market">Market</option>
            </select>
          </label>
        )}
        <label className="text-xs font-semibold uppercase text-neutral-600">
          Record status
          <select className="mt-1 h-10 w-full border border-neutral-300 bg-white px-2 text-sm normal-case" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option><option value="Active">Active</option><option value="Inactive">Inactive</option>
          </select>
        </label>
        <label className="text-xs font-semibold uppercase text-neutral-600">
          Expiry state
          <select className="mt-1 h-10 w-full border border-neutral-300 bg-white px-2 text-sm normal-case" value={expiryFilter} onChange={(event) => setExpiryFilter(event.target.value)}>
            <option value="">All expiry states</option><option value="Expired">Expired</option><option value="Expiring">Expiring</option><option value="Valid">Valid</option><option value="Missing">Missing</option>
          </select>
        </label>
      </section>

      <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {loading ? <p className="p-6 text-center text-sm text-neutral-500">Loading fleet records…</p> : filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-500">{records.length ? "No records match these filters." : "No master records yet. Add one or use the backfill script to import historical LHC data."}</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-neutral-50 text-xs uppercase text-neutral-600">
                  <tr>{(kind === "vehicles" ? ["Vehicle", "Ownership", "Type / Capacity", "Expiry", "Status"] : ["Driver", "Mobile", "Licence", "Expiry", "Status"]).map((label) => <th key={label} className="px-4 py-3">{label}</th>)}<th className="px-4 py-3">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filtered.map((row) => {
                    const state = expiryState(row, kind, warnDays);
                    return (
                      <tr key={row._id}>
                        {kind === "vehicles" ? (
                          <>
                            <td className="px-4 py-3 font-semibold">{(row as VehicleMaster).registrationNumber}</td>
                            <td className="px-4 py-3">{(row as VehicleMaster).ownership}</td>
                            <td className="px-4 py-3">{[(row as VehicleMaster).truckType, `${(row as VehicleMaster).capacity} ${(row as VehicleMaster).capacityUnit}`].filter(Boolean).join(" · ")}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 font-semibold">{(row as DriverMaster).name}</td>
                            <td className="px-4 py-3">{(row as DriverMaster).mobile || "—"}</td>
                            <td className="px-4 py-3">{(row as DriverMaster).licenseNumber || "—"}</td>
                          </>
                        )}
                        <td className="px-4 py-3"><Badge status={state}>{state}</Badge></td>
                        <td className="px-4 py-3"><Badge status={row.status}>{row.status}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => void showDetails(row)}>Details</Button>
                            <Button size="sm" variant="outline" onClick={() => beginEdit(row)}>Edit</Button>
                            {row.status === "Active" && <Button size="sm" variant="danger" onClick={() => void deactivate(row)}>Deactivate</Button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-neutral-100 md:hidden">
              {filtered.map((row) => (
                <li key={row._id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 font-semibold">{kind === "vehicles" ? (row as VehicleMaster).registrationNumber : (row as DriverMaster).name}
                      <p className="text-xs font-normal text-neutral-500">{kind === "vehicles" ? `${(row as VehicleMaster).ownership} · ${(row as VehicleMaster).truckType}` : `${(row as DriverMaster).mobile || "No mobile"} · ${(row as DriverMaster).licenseNumber || "No licence"}`}</p>
                    </div>
                    <Badge status={row.status}>{row.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2"><Badge status={expiryState(row, kind, warnDays)}>{expiryState(row, kind, warnDays)}</Badge></div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="ghost" onClick={() => void showDetails(row)}>Details</Button>
                    <Button size="sm" variant="outline" onClick={() => beginEdit(row)}>Edit</Button>
                    {row.status === "Active" && <Button size="sm" variant="danger" onClick={() => void deactivate(row)}>Deactivate</Button>}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:p-8" role="dialog" aria-modal="true" aria-label={`Edit ${kind === "vehicles" ? "vehicle" : "driver"}`}>
          <form onSubmit={saveDraft} className="my-auto w-full max-w-4xl space-y-5 rounded-xl bg-white p-4 shadow-xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{draft.kind === "vehicle" ? (draft.data.registrationNumber ? "Edit vehicle" : "Add vehicle") : (draft.data.name ? "Edit driver" : "Add driver")}</h2>
              <Button type="button" variant="ghost" onClick={() => setDraft(null)}>Close</Button>
            </div>
            {draft.kind === "vehicle" ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Input label="Registration number" required value={draft.data.registrationNumber} onChange={(event) => updateVehicleField("registrationNumber", event.target.value.toUpperCase())} />
                  <label className="text-xs font-semibold uppercase text-neutral-600">Ownership<select className="mt-1 h-10 w-full border border-neutral-300 bg-white px-2 text-sm normal-case" value={draft.data.ownership} onChange={(event) => updateVehicleField("ownership", event.target.value as VehicleDraft["ownership"])}><option>Own</option><option>Market</option></select></label>
                  <label className="text-xs font-semibold uppercase text-neutral-600">Owner supplier (optional)<select className="mt-1 h-10 w-full border border-neutral-300 bg-white px-2 text-sm normal-case" value={draft.data.ownerSupplierId} onChange={(event) => updateVehicleField("ownerSupplierId", event.target.value)}><option value="">Not linked</option>{supplierOptions.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}</select></label>
                  <Input label="Truck type" value={draft.data.truckType} onChange={(event) => updateVehicleField("truckType", event.target.value)} />
                  <Input label="Capacity" type="number" min={0} step="any" value={draft.data.capacity} onChange={(event) => updateVehicleField("capacity", Number(event.target.value))} />
                  <label className="text-xs font-semibold uppercase text-neutral-600">Capacity unit<select className="mt-1 h-10 w-full border border-neutral-300 bg-white px-2 text-sm normal-case" value={draft.data.capacityUnit} onChange={(event) => updateVehicleField("capacityUnit", event.target.value as VehicleDraft["capacityUnit"])}><option value="MTS">MTS</option><option value="KGS">KGS</option></select></label>
                  <Input label="Make" value={draft.data.make} onChange={(event) => updateVehicleField("make", event.target.value)} />
                  <Input label="Model" value={draft.data.model} onChange={(event) => updateVehicleField("model", event.target.value)} />
                  <Input label="Year" type="number" min={1900} max={2200} value={draft.data.year} onChange={(event) => updateVehicleField("year", event.target.value)} />
                  <Input label="Chassis number" value={draft.data.chassisNo} onChange={(event) => updateVehicleField("chassisNo", event.target.value.toUpperCase())} />
                  <Input label="Engine number" value={draft.data.engineNo} onChange={(event) => updateVehicleField("engineNo", event.target.value.toUpperCase())} />
                  <label className="text-xs font-semibold uppercase text-neutral-600">Status<select className="mt-1 h-10 w-full border border-neutral-300 bg-white px-2 text-sm normal-case" value={draft.data.status} onChange={(event) => updateVehicleField("status", event.target.value as VehicleDraft["status"])}><option>Active</option><option>Inactive</option></select></label>
                </div>
                <section className="space-y-3">
                  <h3 className="font-semibold">Documents</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {VEHICLE_DOCUMENT_KEYS.map((key) => {
                      const document = draft.data.documents[key];
                      const docStatus = getDocumentStatus(document.expiresOn, new Date(), warnDays);
                      return (
                        <div key={key} className="space-y-2 rounded-lg border border-neutral-200 p-3">
                          <div className="flex items-center justify-between gap-2"><h4 className="font-medium">{DOCUMENT_LABELS[key]}</h4><Badge status={docStatus}>{docStatus}</Badge></div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input label="Number" value={document.number} onChange={(event) => updateVehicleDocument(key, "number", event.target.value)} />
                            <Input label="Issued on" type="date" value={day(document.issuedOn)} onChange={(event) => updateVehicleDocument(key, "issuedOn", event.target.value)} />
                            <Input label="Expires on" type="date" value={day(document.expiresOn)} onChange={(event) => updateVehicleDocument(key, "expiresOn", event.target.value)} />
                            <label className="text-xs font-semibold uppercase text-neutral-600">Upload (PDF/image)<input className="mt-1 block w-full text-sm normal-case" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => event.target.files?.[0] && setPendingFiles((current) => ({ ...current, [key]: event.target.files![0] }))} /></label>
                          </div>
                          {document.fileUrl && <a className="text-sm text-brand-700 underline" href={document.fileUrl} target="_blank" rel="noreferrer">View uploaded file</a>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium">Other documents</h4>
                    {draft.data.otherDocuments.map((document, index) => (
                      <div key={document._id ?? `other-${index}`} className="grid gap-2 rounded-lg border border-neutral-200 p-3 sm:grid-cols-4">
                        <Input label="Document name" value={document.name} onChange={(event) => updateVehicleField("otherDocuments", draft.kind === "vehicle" ? draft.data.otherDocuments.map((item, i) => i === index ? { ...item, name: event.target.value } : item) : [])} />
                        <Input label="Number" value={document.number} onChange={(event) => updateVehicleField("otherDocuments", draft.kind === "vehicle" ? draft.data.otherDocuments.map((item, i) => i === index ? { ...item, number: event.target.value } : item) : [])} />
                        <Input label="Expires on" type="date" value={day(document.expiresOn)} onChange={(event) => updateVehicleField("otherDocuments", draft.kind === "vehicle" ? draft.data.otherDocuments.map((item, i) => i === index ? { ...item, expiresOn: event.target.value } : item) : [])} />
                        <label className="text-xs font-semibold uppercase text-neutral-600">Upload<input className="mt-1 block w-full text-sm normal-case" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => event.target.files?.[0] && setPendingFiles((current) => ({ ...current, [`otherDocuments.${index}`]: event.target.files![0] }))} /></label>
                        {document.fileUrl && <a className="text-sm text-brand-700 underline" href={document.fileUrl} target="_blank" rel="noreferrer">View file</a>}
                        <Button type="button" size="sm" variant="danger" onClick={() => removeOtherDocument(index)}>Remove document</Button>
                      </div>
                    ))}
                    <div className="flex flex-wrap items-end gap-2">
                      <Input label="New document name" value={otherDocumentName} onChange={(event) => setOtherDocumentName(event.target.value)} />
                      <Input label="Expires on" type="date" value={otherDocumentExpiry} onChange={(event) => setOtherDocumentExpiry(event.target.value)} />
                      <Button type="button" variant="outline" onClick={addOtherDocument}>Add document</Button>
                    </div>
                  </div>
                </section>
                <label className="text-xs font-semibold uppercase text-neutral-600">Default driver (optional)<select className="mt-1 h-10 w-full border border-neutral-300 bg-white px-2 text-sm normal-case" value={draft.data.defaultDriverId} onChange={(event) => updateVehicleField("defaultDriverId", event.target.value)}><option value="">Not assigned</option>{driverOptions.map((driver) => <option key={driver._id} value={driver._id}>{driver.name}</option>)}</select></label>
                <label className="block text-xs font-semibold uppercase text-neutral-600">Notes<textarea className="mt-1 min-h-20 w-full border border-neutral-300 p-2 text-sm normal-case" value={draft.data.notes} onChange={(event) => updateVehicleField("notes", event.target.value)} /></label>
              </>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Name" required value={draft.data.name} onChange={(event) => updateDriverField("name", event.target.value)} />
                <Input label="Mobile" type="tel" value={draft.data.mobile} onChange={(event) => updateDriverField("mobile", event.target.value)} />
                <Input label="Licence number" value={draft.data.licenseNumber} onChange={(event) => updateDriverField("licenseNumber", event.target.value.toUpperCase())} />
                <Input label="Licence class" value={draft.data.licenseClass} onChange={(event) => updateDriverField("licenseClass", event.target.value.toUpperCase())} />
                <div className="space-y-1"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase text-neutral-600">Licence expiry</span><Badge status={getDocumentStatus(draft.data.licenseExpiry, new Date(), warnDays)}>{getDocumentStatus(draft.data.licenseExpiry, new Date(), warnDays)}</Badge></div><Input aria-label="Licence expiry" type="date" value={day(draft.data.licenseExpiry)} onChange={(event) => updateDriverField("licenseExpiry", event.target.value)} /></div>
                <label className="text-xs font-semibold uppercase text-neutral-600">Status<select className="mt-1 h-10 w-full border border-neutral-300 bg-white px-2 text-sm normal-case" value={draft.data.status} onChange={(event) => updateDriverField("status", event.target.value as DriverDraft["status"])}><option>Active</option><option>Inactive</option></select></label>
                <label className="text-xs font-semibold uppercase text-neutral-600 sm:col-span-2">Address<textarea className="mt-1 min-h-20 w-full border border-neutral-300 p-2 text-sm normal-case" value={draft.data.address} onChange={(event) => updateDriverField("address", event.target.value)} /></label>
                <label className="text-xs font-semibold uppercase text-neutral-600 sm:col-span-2">Notes<textarea className="mt-1 min-h-20 w-full border border-neutral-300 p-2 text-sm normal-case" value={draft.data.notes} onChange={(event) => updateDriverField("notes", event.target.value)} /></label>
              </div>
            )}
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-neutral-200 pt-3">
              <Button type="button" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
              <Button type="submit" isLoading={saving}>Save {draft.kind}</Button>
            </div>
          </form>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:p-8" role="dialog" aria-modal="true" aria-label="Fleet details">
          <section className="my-auto w-full max-w-2xl space-y-4 rounded-xl bg-white p-4 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{kind === "vehicles" ? (detail.data as VehicleMaster).registrationNumber : (detail.data as DriverMaster).name}</h2><p className="text-sm text-neutral-500">Master record and historical fleet activity</p></div><Button variant="ghost" onClick={() => setDetail(null)}>Close</Button></div>
            {detailLoading ? <p className="text-sm text-neutral-500">Loading detail…</p> : (
              <>
                {kind === "vehicles" ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Stat title="Trips" value={(detail.stats as VehicleSummary | null)?.trips ?? 0} />
                    <Stat title="Total hire cost" value={`₹${((detail.stats as VehicleSummary | null)?.totalHire ?? 0).toLocaleString("en-IN")}`} />
                    <Stat title="Last hired" value={day((detail.stats as VehicleSummary | null)?.lastHired) || "—"} />
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Stat title="Trips" value={(detail.stats as DriverSummary | null)?.trips ?? 0} />
                    <Stat title="Last trip" value={day((detail.stats as DriverSummary | null)?.lastTrip) || "—"} />
                    <Stat title="Vehicles" value={(detail.stats as DriverSummary | null)?.vehicles.join(", ") || "—"} />
                  </div>
                )}
                {kind === "vehicles" && <div className="space-y-2"><h3 className="font-semibold">Document status</h3><div className="grid gap-2 sm:grid-cols-2">{VEHICLE_DOCUMENT_KEYS.map((key) => {
                  const vehicle = detail.data as VehicleMaster;
                  const doc = vehicle.documents?.[key] ?? DEFAULT_DOCUMENT;
                  const state = getDocumentStatus(doc.expiresOn, new Date(), warnDays);
                  return <div key={key} className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 p-2 text-sm"><span>{DOCUMENT_LABELS[key]} · {doc.number || "No number"}{doc.fileUrl && <a className="ml-2 text-brand-700 underline" href={doc.fileUrl} target="_blank" rel="noreferrer">View</a>}</span><Badge status={state}>{state}</Badge></div>;
                })}{(detail.data as VehicleMaster).otherDocuments.map((document, index) => {
                  const state = getDocumentStatus(document.expiresOn, new Date(), warnDays);
                  return <div key={document._id ?? index} className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 p-2 text-sm"><span>{document.name}{document.fileUrl && <a className="ml-2 text-brand-700 underline" href={document.fileUrl} target="_blank" rel="noreferrer">View</a>}</span><Badge status={state}>{state}</Badge></div>;
                })}</div></div>}
                {kind === "drivers" && <p className="text-sm">Licence expiry: {(detail.data as DriverMaster).licenseExpiry ? day((detail.data as DriverMaster).licenseExpiry) : "Not recorded"} <Badge status={getDocumentStatus((detail.data as DriverMaster).licenseExpiry, new Date(), warnDays)}>{getDocumentStatus((detail.data as DriverMaster).licenseExpiry, new Date(), warnDays)}</Badge></p>}
                {detailError && <p role="alert" className="text-sm text-red-700">{detailError}</p>}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Stat({ title, value }: { title: string; value: ReactNode }) {
  return <div className="rounded-lg border border-neutral-200 p-3"><p className="text-xs uppercase text-neutral-500">{title}</p><p className="mt-1 break-words font-semibold text-neutral-900">{value}</p></div>;
}
