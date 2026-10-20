"use client";

import { BadgeCheck, Building2, CirclePlus, Hash, Home, Landmark, Mail, Map, MapPin, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useFormContext } from "react-hook-form";
import { FormSection } from "@/components/billing/FormSection";
import { Input } from "@/components/ui/Input";
import type { BillingFormValues } from "@/lib/validations/billing";

interface PartyCardProps {
  prefix: "consignor" | "consignee";
  title: string;
  description: string;
}

interface CustomerRow {
  _id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  mobile?: string;
  email?: string;
}

/** Debounced, cancellable server-side search. Empty query = list all (first page). */
function useCustomerSearch(query: string, enabled: boolean) {
  const [items, setItems] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await axios.get("/api/admin/customer/get", {
          params: { search: query.trim() || undefined, currentPage: 1, itemsPerPage: 50 },
          signal: controller.signal,
        });
        setItems(res.data?.data?.customers ?? []);
        setLoading(false);
      } catch (err) {
        if (axios.isCancel(err)) return; // a newer request took over
        setItems([]);
        setLoading(false);
      }
    }, query ? 250 : 0); // no delay when just opening the list

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, enabled]);

  return { items, loading };
}

export function PartyCard({ prefix, title, description }: PartyCardProps) {
  const {
    register,
    setValue,
    resetField,
    formState: { errors },
  } = useFormContext<BillingFormValues>();
  const sectionErrors = errors[prefix];

  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); // only what the user typed since opening
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { items, loading } = useCustomerSearch(searchTerm, open);

  // Close on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const handleSelect = (c: CustomerRow) => {
    setValue(`${prefix}.customerId`, c._id);
    setValue(`${prefix}.name`, c.name, { shouldValidate: true });
    setValue(`${prefix}.address`, c.address ?? "", { shouldValidate: true });
    setValue(`${prefix}.city`, c.city ?? "", { shouldValidate: true });
    setValue(`${prefix}.state`, c.state ?? "", { shouldValidate: true });
    setValue(`${prefix}.pincode`, c.pincode ?? "");
    setValue(`${prefix}.gstin`, c.gstin ?? "", { shouldValidate: true });
    setValue(`${prefix}.mobile`, c.mobile ?? "", { shouldValidate: true });
    setValue(`${prefix}.email`, c.email ?? "");
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleAddNew = () => {
    (["customerId", "name", "address", "city", "state", "pincode", "gstin", "mobile", "email"] as const).forEach(
      (f) => resetField(`${prefix}.${f}`, { defaultValue: "" })
    );
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setSearchTerm("");
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0 && items[activeIndex]) {
      e.preventDefault(); // don't submit the form
      handleSelect(items[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Wrap RHF's handlers so we keep validation AND add search behaviour
  const nameField = register(`${prefix}.name`);

  const isConsignor = prefix === "consignor";

  return (
    <FormSection
      title={title}
      description={description}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div ref={wrapperRef} className="relative">
            <Input
              size="compact"
              label="Company / Customer Name" hi="कंपनी / ग्राहक का नाम" startIcon={<Building2 className="h-3.5 w-3.5" />}
              required
              autoComplete="off"
              error={sectionErrors?.name?.message}
              {...nameField}
              onFocus={() => {
                setSearchTerm(""); // show everyone on click
                setActiveIndex(-1);
                setOpen(true);
              }}
              onChange={(e) => {
                nameField.onChange(e);
                setValue(`${prefix}.customerId`, ""); // manual edit → no longer a saved customer
                setSearchTerm(e.target.value);
                setActiveIndex(-1);
                setOpen(true);
              }}
              onKeyDown={handleKeyDown}
            />

            {open && (
              <ul
                role="listbox"
                className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-card-hover"
              >
                {loading && items.length === 0 && (
                  <li className="px-3.5 py-2.5 text-body-sm text-neutral-500">Searching…</li>
                )}
                {!loading && items.length === 0 && (
                  <li className="px-3.5 py-2.5 text-body-sm text-neutral-500">
                    No matches. Keep typing to add a new customer.
                  </li>
                )}
                {items.map((c, i) => (
                  <li
                    key={c._id}
                    role="option"
                    aria-selected={i === activeIndex}
                    // onMouseDown (not onClick) so it fires before the input blurs
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(c);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`cursor-pointer px-3.5 py-2 ${i === activeIndex ? "bg-neutral-100" : ""}`}
                  >
                    <p className="text-body-sm font-medium text-neutral-900">{c.name}</p>
                    <p className="text-[11px] text-neutral-500">
                      {[c.city, c.state].filter(Boolean).join(", ")}
                      {c.gstin ? ` · ${c.gstin}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Input size="compact" label="Address" hi="पता" startIcon={<Home className="h-3.5 w-3.5" />} required error={sectionErrors?.address?.message} {...register(`${prefix}.address`)} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input size="compact" required label="City" hi="शहर" startIcon={<Landmark className="h-3.5 w-3.5" />} error={sectionErrors?.city?.message} {...register(`${prefix}.city`)} />
          <Input size="compact" required label="State" hi="राज्य" startIcon={<Map className="h-3.5 w-3.5" />} error={sectionErrors?.state?.message} {...register(`${prefix}.state`)} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input size="compact" label="PIN Code" hi="पिन कोड" startIcon={<Hash className="h-3.5 w-3.5" />} error={sectionErrors?.pincode?.message} {...register(`${prefix}.pincode`)} />
          <Input size="compact" required label="GSTIN" hi="जीएसटीआईएन" startIcon={<BadgeCheck className="h-3.5 w-3.5" />} error={sectionErrors?.gstin?.message} {...register(`${prefix}.gstin`)} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input size="compact" label="Mobile Number" hi="मोबाइल नंबर" startIcon={<Smartphone className="h-3.5 w-3.5" />} error={sectionErrors?.mobile?.message} {...register(`${prefix}.mobile`)} />
          <Input size="compact" type="email" label="Email" hi="ईमेल" startIcon={<Mail className="h-3.5 w-3.5" />} error={sectionErrors?.email?.message} {...register(`${prefix}.email`)} />
        </div>

        <button
          type="button"
          onClick={handleAddNew}
          className={`focus-ring inline-flex items-center gap-1.5 rounded-md text-xs font-semibold transition-colors ${
            isConsignor ? "text-teal-700 hover:text-teal-900" : "text-violet-700 hover:text-violet-900"
          }`}
        >
          <CirclePlus className="size-4" aria-hidden="true" />
          Clear / add as new customer
        </button>
      </div>
    </FormSection>
  );
}