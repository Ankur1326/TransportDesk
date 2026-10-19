import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "@/components/icons";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  /** Hindi meaning shown in brackets after the label. */
  hi?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  /** Text for a disabled placeholder option shown when no value is selected. */
  placeholder?: string;
  /**
   * Visual density. "default" preserves the original size used across the
   * app; "compact" is a tighter variant for dense forms (e.g. the billing
   * form) and does not change behavior/validation.
   */
  size?: any;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, hi, error, helperText, options, placeholder, id, required, size = "default", ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const helperId = `${selectId}-helper`;
    const errorId = `${selectId}-error`;
    const isCompact = size === "compact";

    return (
      <div className="group w-full">
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              "mb-1.5 block text-body-sm font-medium text-neutral-800 transition-colors group-focus-within:text-brand-700",
              isCompact && "mb-0.5 text-[9.5px] font-semibold uppercase tracking-[0.02em] text-neutral-600"
            )}
          >
            {label}
            {hi && <span className="ml-1 text-[11px] font-medium normal-case tracking-normal text-neutral-500">({hi})</span>}
            {required && <span className="ml-0.5 text-error-600">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            required={required}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              "focus-ring h-11 w-full appearance-none rounded-lg border border-neutral-300 bg-white px-3.5 pr-9 text-body text-neutral-900",
              "transition-colors hover:border-neutral-400",
              isCompact && "h-8 rounded-md px-2 pr-6 text-[12px]",
              error && "uts-shake border-error-500 hover:border-error-500 focus-visible:ring-error-500",
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className={cn(
              "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400",
              isCompact && "right-2 h-3.5 w-3.5"
            )}
            aria-hidden="true"
          />
        </div>

        {error ? (
          <p id={errorId} className={cn("mt-1.5 text-body-sm text-error-600", isCompact && "mt-0.5 text-[10px]")}>
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className={cn("mt-1.5 text-body-sm text-neutral-500", isCompact && "mt-0.5 text-[10px]")}>
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";