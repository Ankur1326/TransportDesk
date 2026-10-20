"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Building2, Check, CreditCard, FileText, Hash, ImagePlus, Loader2, Palette, Save, Trash2 } from "@/components/icons";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/Input";
import { useAppearanceTheme } from "@/components/AppearanceProvider";
import {
  APPEARANCE_PRESETS,
  DEFAULT_APPEARANCE_THEME,
  validateAppearanceTheme,
  type AppearanceColorKey,
  type AppearanceTheme,
} from "@/lib/appearance-theme";
import {
  DEFAULT_COMPANY_SETTINGS,
  type CompanySettingsResponse,
  type LRFormat,
  type CompanySettingsValues,
} from "@/lib/company-settings";
import type { ChargeDefinition } from "@/lib/charges";
import { LrFormatGallery } from "@/components/settings/LrFormatGallery";

const TABS = [
  { id: "company", label: "Company Account", icon: Building2 },
  { id: "payments", label: "Payment Integration", icon: CreditCard },
  { id: "documents", label: "Document Settings", icon: FileText },
  { id: "numbering", label: "Consignment Settings", icon: Hash },
  { id: "appearance", label: "Appearance & Colors", icon: Palette },
] as const;

type TabId = (typeof TABS)[number]["id"];
type TextSettingKey = Exclude<keyof CompanySettingsValues, "consignmentStartNumber" | "accountType" | "lrFormat" | "lrFormatBackgrounds" | "chargeDefinitions">;
type ImageSettingKey = "companyLogo" | "signature" | "upiQrCode";
type AppearanceTabId = TabId | "appearance";

const APPEARANCE_COLOR_GROUPS: { title: string; keys: AppearanceColorKey[] }[] = [
  { title: "Brand & buttons", keys: ["primary", "accent", "buttonBackground", "buttonText", "buttonHover"] },
  { title: "Page & cards", keys: ["pageBackground", "cardBackground"] },
  { title: "Text & borders", keys: ["text", "mutedText", "border"] },
  { title: "Sidebar", keys: ["sidebarBackground", "sidebarText", "sidebarActiveBackground", "sidebarActiveText"] },
];

const APPEARANCE_COLOR_LABELS: Record<AppearanceColorKey, string> = {
  primary: "Primary brand",
  accent: "Accent",
  pageBackground: "Page background",
  cardBackground: "Card background",
  text: "Main text",
  mutedText: "Muted text",
  border: "Borders",
  sidebarBackground: "Sidebar background",
  sidebarText: "Sidebar text",
  sidebarActiveBackground: "Active item background",
  sidebarActiveText: "Active item text",
  buttonBackground: "Button background",
  buttonText: "Button text",
  buttonHover: "Button hover",
};


function Field({
  label,
  children,
  required = false,
  helper,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
  helper?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-1 text-red-600">*</span>}
      </span>
      {children}
      {helper && <span className="block text-xs text-slate-500">{helper}</span>}
    </label>
  );
}

// Flat, square style shared with <Input> — used by the select / textarea fields that Input doesn't cover.
const inputClassName =
  "w-full rounded-none border-0 border-b border-neutral-300 bg-neutral-100 px-3 text-[13px] font-medium text-neutral-900 outline-none transition-colors hover:bg-neutral-200/60 focus:border-brand-600 focus:bg-white focus:shadow-[inset_0_-1px_0_var(--color-brand-600)]";

async function readImageFile(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Choose a PNG, JPEG, or WebP image.");
  }
  if (file.size > 256 * 1024) {
    throw new Error("Each image must be no larger than 256 KB.");
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Unable to read the selected image"));
    };
    reader.onerror = () => reject(new Error("Unable to read the selected image"));
    reader.readAsDataURL(file);
  });
}

function ImageSetting({
  title,
  description,
  value,
  onChange,
  onRemove,
}: {
  title: string;
  description: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center">
      <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50">
        {value ? (
          <img src={value} alt={title} className="h-full w-full object-contain" />
        ) : (
          <ImagePlus className="h-8 w-8 text-slate-400" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">{description} PNG, JPEG or WebP, max 256 KB.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <label className="focus-ring inline-flex h-9 cursor-pointer items-center rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Choose image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={onChange}
            />
          </label>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const {
    theme: currentAppearance,
    setTheme: previewAppearance,
    saveTheme: persistAppearance,
    isLoading: isAppearanceLoading,
  } = useAppearanceTheme();
  const [settings, setSettings] = useState<CompanySettingsValues>(DEFAULT_COMPANY_SETTINGS);
  const [activeTab, setActiveTab] = useState<AppearanceTabId>("company");
  const [appearanceDraftState, setAppearanceDraftState] = useState<AppearanceTheme>(currentAppearance);
  const [hasAppearanceEdits, setHasAppearanceEdits] = useState(false);
  const appearanceDraft = hasAppearanceEdits ? appearanceDraftState : currentAppearance;
  const [isLoading, setLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const response = await fetch("/api/admin/settings", { cache: "no-store" });
        const result = (await response.json()) as CompanySettingsResponse;
        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message || "Unable to load company settings");
        }
        if (!cancelled) {
          setSettings({
            ...DEFAULT_COMPANY_SETTINGS,
            ...result.data,
            lrFormatBackgrounds: {
              ...DEFAULT_COMPANY_SETTINGS.lrFormatBackgrounds,
              ...result.data.lrFormatBackgrounds,
            },
            chargeDefinitions: result.data.chargeDefinitions ?? DEFAULT_COMPANY_SETTINGS.chargeDefinitions,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load company settings");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateText(field: TextSettingKey, value: string) {
    setSettings((current) => ({ ...current, [field]: value }));
    setSavedMessage("");
  }

  async function handleImageChange(field: ImageSettingKey, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const dataUrl = await readImageFile(file);
      setSettings((current) => ({ ...current, [field]: dataUrl }));
      setErrorMessage("");
      setSavedMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to read the selected image");
    }
  }

  async function handleLRBackgroundChange(format: LRFormat, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const backgroundImage = await readImageFile(file);
      setSettings((current) => ({
        ...current,
        lrFormatBackgrounds: {
          ...current.lrFormatBackgrounds,
          [format]: { ...current.lrFormatBackgrounds[format], backgroundImage },
        },
      }));
      setErrorMessage("");
      setSavedMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to read the selected image");
    }
  }

  function updateLRBackgroundColor(format: LRFormat, backgroundColor: string) {
    setSettings((current) => ({
      ...current,
      lrFormatBackgrounds: {
        ...current.lrFormatBackgrounds,
        [format]: { ...current.lrFormatBackgrounds[format], backgroundColor },
      },
    }));
    setSavedMessage("");
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setSavedMessage("");

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const result = (await response.json()) as CompanySettingsResponse;
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "Unable to save company settings");
      }
      setSettings({
        ...DEFAULT_COMPANY_SETTINGS,
        ...result.data,
        lrFormatBackgrounds: {
          ...DEFAULT_COMPANY_SETTINGS.lrFormatBackgrounds,
          ...result.data.lrFormatBackgrounds,
        },
        chargeDefinitions: result.data.chargeDefinitions ?? DEFAULT_COMPANY_SETTINGS.chargeDefinitions,
      });
      setSavedMessage("Settings saved successfully.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save company settings");
    } finally {
      setSaving(false);
    }
  }

  function updateAppearance(nextTheme: AppearanceTheme) {
    setAppearanceDraftState(nextTheme);
    setHasAppearanceEdits(true);
    previewAppearance(nextTheme);
    setErrorMessage("");
    setSavedMessage("");
  }

  async function saveAppearance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateAppearanceTheme(appearanceDraft)) {
      setErrorMessage("Choose colors with readable text contrast (at least 4.5:1).");
      setSavedMessage("");
      return;
    }
    setSaving(true);
    setErrorMessage("");
    setSavedMessage("");
    try {
      await persistAppearance(appearanceDraft);
      setHasAppearanceEdits(false);
      setSavedMessage("Appearance saved successfully.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save appearance settings");
    } finally {
      setSaving(false);
    }
  }

  const currentTab = TABS.find((tab) => tab.id === activeTab);
  const activeTitle = currentTab?.label ?? "Appearance & Colors";
  const appearanceIsValid = validateAppearanceTheme(appearanceDraft) !== null;

  return (
    <div className="w-full space-y-3 pb-5">
      <div className="sticky top-0 z-40 -mx-3 border-y border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur dark:border-brand-800 dark:bg-brand-950/95">
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setActiveTab(id);
              setErrorMessage("");
              setSavedMessage("");
            }}
            aria-current={activeTab === id ? "page" : undefined}
            className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              activeTab === id
                ? "bg-[#837C7B] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
        </div>
      </div>

      <form
        onSubmit={(event) => {
          if (activeTab === "appearance") void saveAppearance(event);
          else void saveSettings(event);
        }}
        className="space-y-3"
      >
        <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-950">{activeTitle}</h3>
            {!isLoading && (
              <div className="flex flex-wrap items-center justify-end gap-3">
                <div aria-live="polite" className="text-xs">
                  {errorMessage && <p className="font-medium text-red-700">{errorMessage}</p>}
                  {savedMessage && (
                    <p className="flex items-center gap-1 font-medium text-emerald-700">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      {savedMessage}
                    </p>
                  )}
                </div>
                <Button type="submit" isLoading={isSaving} size="sm">
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save changes
                </Button>
              </div>
            )}
          </div>

          {(activeTab === "appearance" ? isAppearanceLoading : isLoading) ? (
            <div className="flex min-h-32 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
              Loading settings…
            </div>
          ) : (
            <>
              {activeTab === "company" && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <Input label="Your Company Name" required value={settings.companyName} maxLength={160} onChange={(e) => updateText("companyName", e.target.value)} />
                    <Input label="Company GST No." value={settings.gstNumber} maxLength={15} autoCapitalize="characters" placeholder="15-character GSTIN" onChange={(e) => updateText("gstNumber", e.target.value.toUpperCase())} />
                    <Input label="1st Mobile Number" type="tel" value={settings.mobile1} maxLength={30} onChange={(e) => updateText("mobile1", e.target.value)} />
                    <Input label="2nd Mobile Number" type="tel" value={settings.mobile2} maxLength={30} onChange={(e) => updateText("mobile2", e.target.value)} />
                    <Input label="Company Email Id" type="email" value={settings.email} maxLength={254} onChange={(e) => updateText("email", e.target.value)} />
                    <Input label="Company Website" type="url" value={settings.website} maxLength={2048} placeholder="https://example.com" onChange={(e) => updateText("website", e.target.value)} />
                    <Input label="Address Line" value={settings.addressLine} maxLength={300} onChange={(e) => updateText("addressLine", e.target.value)} />
                    <Input label="Country" value={settings.country} maxLength={100} onChange={(e) => updateText("country", e.target.value)} />
                    <Input label="State" value={settings.state} maxLength={100} onChange={(e) => updateText("state", e.target.value)} />
                    <Input label="City" value={settings.city} maxLength={100} onChange={(e) => updateText("city", e.target.value)} />
                    <Input label="Pin / Zip Code" value={settings.pinCode} maxLength={20} onChange={(e) => updateText("pinCode", e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <div>
                      <h4 className="font-semibold text-slate-900">Company identity</h4>
                    </div>
                    <ImageSetting
                      title="Company Logo"
                      description="Shown in the company header and printed documents."
                      value={settings.companyLogo}
                      onChange={(event) => void handleImageChange("companyLogo", event)}
                      onRemove={() => updateText("companyLogo", "")}
                    />
                    <ImageSetting
                      title="Authorized Signature"
                      description="Shown on invoice and LR printouts."
                      value={settings.signature}
                      onChange={(event) => void handleImageChange("signature", event)}
                      onRemove={() => updateText("signature", "")}
                    />
                  </div>
                </div>
              )}

              {activeTab === "payments" && (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <Input label="Account Holder Name" value={settings.accountHolderName} maxLength={160} onChange={(e) => updateText("accountHolderName", e.target.value)} />
                    <Input label="Name of Bank" value={settings.bankName} maxLength={160} onChange={(e) => updateText("bankName", e.target.value)} />
                    <Input label="Account Number" value={settings.accountNumber} maxLength={34} autoComplete="off" onChange={(e) => updateText("accountNumber", e.target.value)} />
                    <Input label="IFSC Code" value={settings.ifscCode} maxLength={11} autoCapitalize="characters" onChange={(e) => updateText("ifscCode", e.target.value.toUpperCase())} />
                    <Input label="Bank Branch" value={settings.bankBranch} maxLength={160} onChange={(e) => updateText("bankBranch", e.target.value)} />
                    <Field label="Account Type">
                      <select
                        className={`${inputClassName} h-10`}
                        value={settings.accountType}
                        onChange={(e) => setSettings((current) => ({ ...current, accountType: e.target.value as CompanySettingsValues["accountType"] }))}
                      >
                        <option value="Current">Current</option>
                        <option value="Saving">Saving</option>
                        <option value="Others">Others</option>
                      </select>
                    </Field>
                    {settings.accountType === "Others" && (
                      <Input label="Specify Account Type" value={settings.otherAccountType} maxLength={80} onChange={(e) => updateText("otherAccountType", e.target.value)} />
                    )}
                    <Input label="UPI Id" value={settings.upiId} maxLength={100} placeholder="company@bank" onChange={(e) => updateText("upiId", e.target.value)} />
                  </div>
                  <ImageSetting
                    title="UPI QR Code"
                    description="Display your payment QR code on printed documents."
                    value={settings.upiQrCode}
                    onChange={(event) => void handleImageChange("upiQrCode", event)}
                    onRemove={() => updateText("upiQrCode", "")}
                  />
                </div>
              )}

              {activeTab === "documents" && (
                <div className="space-y-3">
                  <section className="space-y-2 rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-slate-900">Document Charges</h4>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={settings.chargeDefinitions.length >= 40}
                        onClick={() => {
                          const definition: ChargeDefinition = {
                            id: `custom-${crypto.randomUUID().replaceAll("-", "")}`,
                            name: "",
                            defaultAmount: null,
                            includeOnBilty: false,
                            includeOnBill: false,
                          };
                          setSettings((current) => ({
                            ...current,
                            chargeDefinitions: [...current.chargeDefinitions, definition],
                          }));
                          setSavedMessage("");
                        }}
                      >
                        Add charge
                      </Button>
                    </div>
                    {settings.chargeDefinitions.map((charge, index) => (
                      <div
                        key={charge.id}
                        className="grid grid-cols-2 items-end gap-x-3 gap-y-2 rounded-lg border border-slate-200 px-3 py-2 sm:grid-cols-[minmax(0,1.5fr)_minmax(8rem,0.7fr)_auto_auto_auto]"
                      >
                        <Input
                            size="compact"
                            label="Charge name"
                            maxLength={60}
                            value={charge.name}
                            onChange={(event) => {
                              const name = event.target.value;
                              setSettings((current) => ({
                                ...current,
                                chargeDefinitions: current.chargeDefinitions.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, name } : item
                                ),
                              }));
                              setSavedMessage("");
                            }}
                          />
                        <Input
                            size="compact"
                            label="Default amount (₹)"
                            type="number"
                            min={0}
                            max={1000000000}
                            step="0.01"
                            placeholder="Not set"
                            value={charge.defaultAmount ?? ""}
                            onChange={(event) => {
                              const rawAmount = event.target.value;
                              const defaultAmount = rawAmount === "" ? null : Number(rawAmount);
                              setSettings((current) => ({
                                ...current,
                                chargeDefinitions: current.chargeDefinitions.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, defaultAmount } : item
                                ),
                              }));
                              setSavedMessage("");
                            }}
                          />
                        <label className="col-span-1 flex min-h-9 items-center gap-1.5 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={charge.includeOnBilty}
                            onChange={(event) => {
                              const includeOnBilty = event.target.checked;
                              setSettings((current) => ({
                                ...current,
                                chargeDefinitions: current.chargeDefinitions.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, includeOnBilty } : item
                                ),
                              }));
                              setSavedMessage("");
                            }}
                          />
                          Bilty
                        </label>
                        <label className="col-span-1 flex min-h-9 items-center gap-1.5 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={charge.includeOnBill}
                            onChange={(event) => {
                              const includeOnBill = event.target.checked;
                              setSettings((current) => ({
                                ...current,
                                chargeDefinitions: current.chargeDefinitions.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, includeOnBill } : item
                                ),
                              }));
                              setSavedMessage("");
                            }}
                          />
                          Bill
                        </label>
                        <button
                          type="button"
                          aria-label={`Remove ${charge.name || "charge"}`}
                          title="Remove charge"
                          className="col-span-2 flex h-8 items-center gap-1 justify-self-end rounded-md px-2 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-700 sm:col-span-1"
                          onClick={() => {
                            setSettings((current) => ({
                              ...current,
                              chargeDefinitions: current.chargeDefinitions.filter((item) => item.id !== charge.id),
                            }));
                            setSavedMessage("");
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Remove
                        </button>
                      </div>
                    ))}
                  </section>
                  <LrFormatGallery
                    settings={settings}
                    onSelect={(format) => {
                      setSettings((current) => ({ ...current, lrFormat: format }));
                      setSavedMessage("");
                    }}
                    onBackgroundColor={updateLRBackgroundColor}
                    onBackgroundImage={(format, event) => void handleLRBackgroundChange(format, event)}
                    onRemoveBackgroundImage={(format) => {
                      setSettings((current) => ({
                        ...current,
                        lrFormatBackgrounds: {
                          ...current.lrFormatBackgrounds,
                          [format]: { ...current.lrFormatBackgrounds[format], backgroundImage: "" },
                        },
                      }));
                      setSavedMessage("");
                    }}
                  />
                  <Field label="Default Invoice Terms And Conditions">
                    <textarea className={`${inputClassName} min-h-24 py-2`} rows={3} maxLength={10000} value={settings.invoiceTerms} onChange={(e) => updateText("invoiceTerms", e.target.value)} />
                  </Field>
                  <Field label="Default Quotation Terms And Conditions">
                    <textarea className={`${inputClassName} min-h-24 py-2`} rows={3} maxLength={10000} value={settings.quotationTerms} onChange={(e) => updateText("quotationTerms", e.target.value)} />
                  </Field>
                  <Field label="Default LR Terms And Conditions">
                    <textarea className={`${inputClassName} min-h-24 py-2`} rows={3} maxLength={10000} value={settings.lrTerms} onChange={(e) => updateText("lrTerms", e.target.value)} />
                  </Field>
                </div>
              )}

              {activeTab === "numbering" && (
                <div className="max-w-xl space-y-3">
                  <Field
                    label="Consignment Starting Number"
                    required
                  >
                    <input
                      className={`${inputClassName} h-10`}
                      type="number"
                      min={1}
                      // max={999999999999}
                      step={1}
                      value={settings.consignmentStartNumber}
                      required
                      onChange={(e) => setSettings((current) => ({
                        ...current,
                        consignmentStartNumber: Number(e.target.value),
                      }))}
                    />
                  </Field>
                </div>
              )}

              {activeTab === "appearance" && (
                <div className="space-y-5">
                  <section className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-slate-900">Choose a theme</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateAppearance(DEFAULT_APPEARANCE_THEME)}
                      >
                        Restore default
                      </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                      {APPEARANCE_PRESETS.map((preset) => {
                        const selected = appearanceDraft.preset === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => updateAppearance({ preset: preset.id, colors: { ...preset.colors } })}
                            className={`rounded-lg border p-3 text-left transition ${
                              selected ? "border-brand-600 ring-2 ring-brand-100" : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <span className="mb-2 flex gap-1.5" aria-hidden="true">
                              {[preset.colors.primary, preset.colors.accent, preset.colors.pageBackground, preset.colors.text].map((color, index) => (
                                <span key={`${preset.id}-${index}`} className="h-5 flex-1 rounded" style={{ backgroundColor: color }} />
                              ))}
                            </span>
                            <span className="block text-sm font-semibold text-slate-900">{preset.name}</span>
                            <span className="mt-0.5 block text-xs text-slate-500">{preset.description}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {APPEARANCE_COLOR_GROUPS.map((group) => (
                        <div key={group.title} className="rounded-lg border border-slate-200 p-3">
                          <h4 className="mb-2 text-sm font-semibold text-slate-900">{group.title}</h4>
                          <div className="grid gap-2">
                            {group.keys.map((key) => (
                              <label key={key} className="flex items-center justify-between gap-3 text-sm text-slate-700">
                                <span>{APPEARANCE_COLOR_LABELS[key]}</span>
                                <span className="flex items-center gap-2">
                                  <span className="font-mono text-[11px] uppercase text-slate-500">{appearanceDraft.colors[key]}</span>
                                  <input
                                    aria-label={APPEARANCE_COLOR_LABELS[key]}
                                    type="color"
                                    value={appearanceDraft.colors[key]}
                                    onChange={(event) => updateAppearance({
                                      ...appearanceDraft,
                                      colors: { ...appearanceDraft.colors, [key]: event.target.value.toUpperCase() },
                                    })}
                                    className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                                  />
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <aside
                      aria-label="Theme preview"
                      className="h-fit space-y-3 rounded-xl border p-4"
                      style={{
                        backgroundColor: appearanceDraft.colors.pageBackground,
                        borderColor: appearanceDraft.colors.border,
                        color: appearanceDraft.colors.text,
                      }}
                    >
                      <div
                        className="rounded-lg border p-3"
                        style={{
                          backgroundColor: appearanceDraft.colors.cardBackground,
                          borderColor: appearanceDraft.colors.border,
                        }}
                      >
                        <p className="text-xs font-medium" style={{ color: appearanceDraft.colors.mutedText }}>Appearance preview</p>
                        <p className="mt-1 font-semibold">Freight operations</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className="rounded-md px-3 py-2 text-xs font-semibold shadow-sm"
                            style={{ backgroundColor: appearanceDraft.colors.buttonBackground, color: appearanceDraft.colors.buttonText }}
                          >
                            Primary action
                          </span>
                          <span
                            className="rounded-md px-3 py-2 text-xs font-semibold"
                            style={{ backgroundColor: appearanceDraft.colors.sidebarActiveBackground, color: appearanceDraft.colors.sidebarActiveText }}
                          >
                            Active item
                          </span>
                        </div>
                      </div>
                      <div
                        className="rounded-lg p-3 text-sm"
                        style={{ backgroundColor: appearanceDraft.colors.sidebarBackground, color: appearanceDraft.colors.sidebarText }}
                      >
                        Sidebar label
                        <span
                          className="mt-2 block rounded-md px-2 py-1.5 text-xs font-semibold"
                          style={{ backgroundColor: appearanceDraft.colors.sidebarActiveBackground, color: appearanceDraft.colors.sidebarActiveText }}
                        >
                          Selected page
                        </span>
                      </div>
                      {!appearanceIsValid && (
                        <p className="text-xs font-medium text-red-700">
                          Text and background colors must keep a contrast ratio of at least 4.5:1.
                        </p>
                      )}
                    </aside>
                  </section>
                  <p className="text-xs text-slate-500">
                    Appearance is saved to your user account and applies throughout the app. Dark mode keeps its dark surfaces and adapts the selected theme accents.
                  </p>
y                </div>
              )}
            </>
          )}
        </section>

      </form>
    </div>
  );
}
