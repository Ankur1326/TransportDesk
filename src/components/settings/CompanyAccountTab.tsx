"use client";

import type { ChangeEvent, ReactNode } from "react";
import {
  Building2,
  Eye,
  EyeOff,
  Globe,
  ImagePlus,
  Mail,
  MapPin,
  Phone,
  PhoneCall,
  ShieldCheck,
  Trash2,
} from "@/components/icons";
import { Input } from "@/components/ui/Input";
import { VisibilitySwitch } from "@/components/settings/VisibilitySwitch";
import {
  getCompanyDocumentInfo,
  type CompanyFieldVisibilityKey,
  type CompanySettingsValues,
} from "@/lib/company-settings";

type TextKey =
  | "companyName"
  | "mobile1"
  | "mobile2"
  | "email"
  | "website"
  | "gstNumber"
  | "panNumber"
  | "registrationNumber"
  | "addressLine"
  | "country"
  | "state"
  | "city"
  | "pinCode"
  | "companyLogo"
  | "signature";

interface CompanyAccountTabProps {
  settings: CompanySettingsValues;
  onText: (field: TextKey, value: string) => void;
  onVisibility: (field: CompanyFieldVisibilityKey, visible: boolean) => void;
  onImage: (field: "companyLogo" | "signature", event: ChangeEvent<HTMLInputElement>) => void;
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          {icon}
        </span>
        <div>
          <h4 className="text-sm font-bold text-slate-950">{title}</h4>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function ImageCard({
  title,
  hint,
  value,
  visible,
  onPick,
  onRemove,
  onVisible,
  shape,
}: {
  title: string;
  hint: string;
  value: string;
  visible: boolean;
  onPick: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  onVisible: (visible: boolean) => void;
  shape: "square" | "wide";
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-950">{title}</h4>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          {visible ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}
          <span>On documents</span>
          <VisibilitySwitch checked={visible} onChange={onVisible} label={title} />
        </label>
      </div>

      <label
        className={`focus-ring group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-brand-500 hover:bg-brand-50/40 ${
          shape === "square" ? "mx-auto aspect-square w-40" : "h-28 w-full"
        } ${visible ? "" : "opacity-50"}`}
      >
        {value ? (
          <img src={value} alt={title} className="h-full w-full object-contain p-2" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs font-medium text-slate-500 group-hover:text-brand-700">
            <ImagePlus className="h-7 w-7" aria-hidden="true" />
            Click to upload
          </span>
        )}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={onPick}
        />
      </label>

      <p className="mt-2 text-center text-[11px] text-slate-500">{hint} PNG, JPEG or WebP, max 256 KB.</p>
      {!visible && value && (
        <p className="mt-1 text-center text-[11px] font-medium text-amber-700">Hidden — not printed on documents.</p>
      )}
      {value && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Remove
          </button>
        </div>
      )}
    </section>
  );
}

function DocumentHeaderPreview({ settings }: { settings: CompanySettingsValues }) {
  const info = getCompanyDocumentInfo(settings);
  const name = settings.companyName.trim() || "Your Company";
  const address = [settings.addressLine, settings.city, settings.state, settings.pinCode].filter(Boolean).join(", ");
  const contact = [info.phones(" / "), info.email, info.website].filter(Boolean).join(" · ");

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="mb-1 text-sm font-bold text-slate-950">Document preview</h4>
      <p className="mb-3 text-xs text-slate-500">How your header looks on printed documents.</p>
      <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
        <div className="flex items-center justify-center gap-2">
          {info.logo && <img src={info.logo} alt="" className="h-10 w-10 object-contain" />}
          <p className="text-sm font-bold uppercase tracking-wide text-[#EF6711]">{name}</p>
        </div>
        {address && <p className="mt-1 text-[11px] font-semibold text-slate-700">{address}</p>}
        {contact && <p className="text-[11px] text-slate-600">{contact}</p>}
        {info.identifiers.length > 0 && (
          <p className="mt-1.5 flex flex-wrap justify-center gap-x-3 text-[11px] font-semibold text-slate-800">
            {info.identifiers.map((item) => (
              <span key={item.key}>{item.label}: {item.value}</span>
            ))}
          </p>
        )}
        <div className="mt-3 flex items-end justify-end gap-2 border-t border-dashed border-slate-200 pt-2">
          {info.signature ? (
            <img src={info.signature} alt="" className="max-h-10 max-w-28 object-contain" />
          ) : (
            <span className="text-[10px] text-slate-400">Authorized signature</span>
          )}
        </div>
      </div>
    </section>
  );
}

export function CompanyAccountTab({ settings, onText, onVisibility, onImage }: CompanyAccountTabProps) {
  const visibility = settings.fieldVisibility;

  /** An input with an inline "show on documents" switch at its right edge. */
  function toggled(key: CompanyFieldVisibilityKey, label: string) {
    return (
      <VisibilitySwitch
        checked={visibility[key]}
        onChange={(next) => onVisibility(key, next)}
        label={label}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start">
      {/* ---------------- LEFT: brand assets ---------------- */}
      <div className="space-y-4 lg:sticky lg:top-20">
        <ImageCard
          title="Company Logo"
          hint="Square logo works best."
          shape="square"
          value={settings.companyLogo}
          visible={visibility.companyLogo}
          onPick={(event) => onImage("companyLogo", event)}
          onRemove={() => onText("companyLogo", "")}
          onVisible={(next) => onVisibility("companyLogo", next)}
        />
        <ImageCard
          title="Authorized Signature"
          hint="Use a transparent or white background."
          shape="wide"
          value={settings.signature}
          visible={visibility.signature}
          onPick={(event) => onImage("signature", event)}
          onRemove={() => onText("signature", "")}
          onVisible={(next) => onVisibility("signature", next)}
        />
        <div className="hidden lg:block">
          <DocumentHeaderPreview settings={settings} />
        </div>
      </div>

      {/* ---------------- RIGHT: fields ---------------- */}
      <div className="space-y-4">
        <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <Eye className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
          Use the switch on each field to choose whether it is printed on LRs, freight bills and other documents. Hidden details stay saved.
        </p>

        <SectionCard
          icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
          title="Business details"
          description="Your company name and how customers can reach you."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input label="Company Name" required value={settings.companyName} maxLength={160} onChange={(e) => onText("companyName", e.target.value)} />
            </div>
            <Input
              label="Phone"
              type="tel"
              startIcon={<Phone className="h-4 w-4" aria-hidden="true" />}
              endAdornment={toggled("mobile1", "Phone")}
              value={settings.mobile1}
              maxLength={30}
              onChange={(e) => onText("mobile1", e.target.value)}
            />
            <Input
              label="Alternate Phone"
              type="tel"
              startIcon={<PhoneCall className="h-4 w-4" aria-hidden="true" />}
              endAdornment={toggled("mobile2", "Alternate phone")}
              value={settings.mobile2}
              maxLength={30}
              onChange={(e) => onText("mobile2", e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              startIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
              endAdornment={toggled("email", "Email")}
              value={settings.email}
              maxLength={254}
              onChange={(e) => onText("email", e.target.value)}
            />
            <Input
              label="Website"
              type="url"
              startIcon={<Globe className="h-4 w-4" aria-hidden="true" />}
              endAdornment={toggled("website", "Website")}
              value={settings.website}
              maxLength={2048}
              placeholder="https://example.com"
              onChange={(e) => onText("website", e.target.value)}
            />
          </div>
        </SectionCard>

        <SectionCard
          icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          title="Registration & tax"
          description="Statutory identifiers printed in the document header."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Input
              label="Registration No."
              endAdornment={toggled("registrationNumber", "Registration number")}
              value={settings.registrationNumber}
              maxLength={40}
              placeholder="CIN / LLPIN / Udyam"
              onChange={(e) => onText("registrationNumber", e.target.value)}
            />
            <Input
              label="PAN No."
              endAdornment={toggled("panNumber", "PAN")}
              value={settings.panNumber}
              maxLength={10}
              autoCapitalize="characters"
              placeholder="ABCDE1234F"
              onChange={(e) => onText("panNumber", e.target.value.toUpperCase())}
            />
            <Input
              label="GSTIN"
              endAdornment={toggled("gstNumber", "GSTIN")}
              value={settings.gstNumber}
              maxLength={15}
              autoCapitalize="characters"
              placeholder="15-character GSTIN"
              onChange={(e) => onText("gstNumber", e.target.value.toUpperCase())}
            />
          </div>
        </SectionCard>

        <SectionCard
          icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
          title="Address"
          description="Registered or operating office address."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input label="Address Line" value={settings.addressLine} maxLength={300} onChange={(e) => onText("addressLine", e.target.value)} />
            </div>
            <Input label="City" value={settings.city} maxLength={100} onChange={(e) => onText("city", e.target.value)} />
            <Input label="State" value={settings.state} maxLength={100} onChange={(e) => onText("state", e.target.value)} />
            <Input label="Pin / Zip Code" value={settings.pinCode} maxLength={20} onChange={(e) => onText("pinCode", e.target.value)} />
            <Input label="Country" value={settings.country} maxLength={100} onChange={(e) => onText("country", e.target.value)} />
          </div>
        </SectionCard>

        <div className="lg:hidden">
          <DocumentHeaderPreview settings={settings} />
        </div>
      </div>
    </div>
  );
}
