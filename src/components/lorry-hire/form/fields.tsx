"use client";
import type { ReactNode } from "react";
import { Controller, get, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";
import type { LorryHireFormValues } from "@/lib/lorry-hire/validations";

type Name = string;

/** Error message for a (possibly nested) field path. */
export function useFieldError(name: Name): string | undefined {
  const { formState } = useFormContext<LorryHireFormValues>();
  const err = get(formState.errors, name);
  return typeof err?.message === "string" ? err.message : undefined;
}

export function TextField({
  name,
  label,
  hi,
  placeholder,
  required,
  type = "text",
  upper,
  className,
  disabled,
  list,
}: {
  name: Name;
  label: string;
  hi?: string;
  placeholder?: string;
  required?: boolean;
  /** id of a <datalist> for suggestions. */
  list?: string;
  type?: string;
  /** Show and store upper-case (vehicle, PAN, IFSC). */
  upper?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const { register } = useFormContext<LorryHireFormValues>();
  const error = useFieldError(name);
  return (
    <div className={className}>
      <Input
        label={label}
        hi={hi}
        type={type}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        list={list}
        error={error}
        className={cn(upper && "uppercase")}
        {...register(name as never)}
      />
    </div>
  );
}

/** Number field: empty means 0, so a fresh form isn't full of "0"s. */
export function NumField({
  name,
  label,
  hi,
  placeholder = "0",
  endAdornment,
  className,
  step = "any",
}: {
  name: Name;
  label: string;
  hi?: string;
  placeholder?: string;
  endAdornment?: ReactNode;
  className?: string;
  step?: string;
}) {
  const { control } = useFormContext<LorryHireFormValues>();
  const error = useFieldError(name);
  return (
    <div className={className}>
      <Controller
        control={control}
        name={name as never}
        render={({ field }) => (
          <Input
            label={label}
            hi={hi}
            type="number"
            inputMode="decimal"
            min={0}
            step={step}
            placeholder={placeholder}
            endAdornment={endAdornment}
            error={error}
            name={field.name}
            ref={field.ref}
            onBlur={field.onBlur}
            value={!field.value ? "" : String(field.value)}
            onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          />
        )}
      />
    </div>
  );
}

export function SelectField({
  name,
  label,
  options,
  className,
  number,
  placeholder,
}: {
  name: Name;
  label: string;
  options: readonly (string | number)[];
  className?: string;
  /** Store the chosen value as a number (e.g. GST rate). */
  number?: boolean;
  /** Shown while nothing is chosen (the stored value is then ""). */
  placeholder?: string;
}) {
  const { register } = useFormContext<LorryHireFormValues>();
  const error = useFieldError(name);
  return (
    <div className={className}>
      <Select
        label={label}
        error={error}
        placeholder={placeholder}
        options={options.map((o) => ({ value: String(o), label: String(o) }))}
        {...register(name as never, number ? { valueAsNumber: true } : undefined)}
      />
    </div>
  );
}

export function TextAreaField({ name, label, rows = 2 }: { name: Name; label: string; rows?: number }) {
  const { register } = useFormContext<LorryHireFormValues>();
  const error = useFieldError(name);
  return <Textarea label={label} rows={rows} error={error} {...register(name as never)} />;
}

/** A section of the form; `id` is the anchor the left rail scrolls to. */
export function FormBlock({
  id,
  title,
  hint,
  action,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border border-neutral-200 bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
          {hint && <p className="text-caption text-neutral-500">{hint}</p>}
        </div>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Optional blocks stay closed until they hold data (or the user opens them). */
export function MoreDetails({
  label,
  hasData,
  children,
}: {
  label: string;
  hasData: boolean;
  children: ReactNode;
}) {
  return (
    <details open={hasData} className="group mt-4 border-t border-dashed border-neutral-200 pt-3">
      <summary className="cursor-pointer select-none text-body-sm font-medium text-brand-700 hover:text-brand-800">
        {label}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export function CheckField({ name, label }: { name: Name; label: string }) {
  const { register } = useFormContext<LorryHireFormValues>();
  return (
    <label className="flex cursor-pointer items-center gap-2 text-body-sm text-neutral-700">
      <input type="checkbox" className="h-4 w-4" {...register(name as never)} />
      {label}
    </label>
  );
}
