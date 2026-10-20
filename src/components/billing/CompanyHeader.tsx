"use client";

import { useCompanySettings } from "@/hooks/useCompanySettings";
import { getCompanyDocumentInfo } from "@/lib/company-settings";

export function CompanyHeader() {
  const { settings } = useCompanySettings();
  const companyName = settings.companyName.trim() || "Your Company";
  const address = [
    settings.addressLine,
    settings.city,
    settings.state,
    settings.pinCode,
    settings.country,
  ].filter(Boolean).join(", ");

  const info = getCompanyDocumentInfo(settings);
  const contact = [info.phones(" · "), info.email]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-brand-700 bg-white">
          {info.logo ? (
            <img src={info.logo} alt={`${companyName} logo`} className="h-full w-full object-contain" />
          ) : (
            <span className="text-h4 font-bold text-brand-800">{companyName.slice(0, 3).toUpperCase()}</span>
          )}
        </div>
        <div>
          <h1 className="text-h3 font-bold uppercase tracking-tight text-brand-800">{companyName}</h1>
          {info.tagline && <p className="text-body-sm italic text-neutral-600">{info.tagline}</p>}
          {address && <p className="text-body-sm text-neutral-500">{address}</p>}
          {contact && <p className="text-body-sm text-neutral-500">{contact}</p>}
        </div>
      </div>

      {info.identifiers.length > 0 && (
        <dl className="text-caption text-neutral-600 sm:text-right">
          {info.identifiers.map((item) => (
            <div key={item.key} className="flex justify-between gap-2 sm:justify-end">
              <dt className="font-medium text-neutral-500">{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}