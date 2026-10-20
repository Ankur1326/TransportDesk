import { getCompanyDocumentInfo, type CompanySettingsValues } from "@/lib/company-settings";

export function FreightBillHeader({ company }: { company: CompanySettingsValues }) {
  const companyAddress = [
    company.addressLine,
    company.city,
    company.state,
    company.pinCode,
    company.country,
  ].filter(Boolean).join(", ");
  const info = getCompanyDocumentInfo(company);
  const phones = info.phones(", ");

  return (
    <div className="">
      <p className="text-center text-xs italic tracking-wide text-slate-500">
        Subject to Vadodara Jurisdiction
      </p>

      <div className="mt-1 flex items-center justify-center gap-4">
        {info.logo && (
          <img
            src={info.logo}
            alt={`${company.companyName || "Company"} logo`}
            className="h-[72px] w-[72px] shrink-0 object-contain"
          />
        )}
        <h1 className="text-center text-[26px] font-bold tracking-wide text-[#EF6711] uppercase">
          {company.companyName || "Company Name"}
        </h1>
      </div>

      <p className="mt-1 text-center text-sm text-slate-700 font-semibold">
        {companyAddress}
      </p>
      <p className="text-center text-sm text-slate-700">
        {info.email && <>E-Mail - <span className="underline">{info.email}</span></>}
        {info.email && phones && "   "}
        {phones && <>Mob. {phones}</>}
      </p>

      {(info.identifiers.length > 0 || info.website) && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 text-sm font-semibold text-slate-800">
          <span className="font-normal text-slate-700">{info.website}</span>
          <span className="flex flex-wrap justify-end gap-x-5">
            {info.identifiers.map((item) => (
              <span key={item.key}>{item.label}: {item.value}</span>
            ))}
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between bg-slate-800 px-4 py-2 text-base font-bold tracking-wide text-white">
        <span className=" w-[55%] text-end">FREIGHT BILL</span>
        <span>HSN / SAC CODE: - 9965</span>
      </div>
    </div>
  );
}