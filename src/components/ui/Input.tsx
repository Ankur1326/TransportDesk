import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;

  /** Hindi meaning shown in brackets after the label, e.g. "पैकेज". */
  hi?: string;

  /** Validation error message */
  error?: string;

  helperText?: string;

  /** Optional icon rendered inside the input */
  startIcon?: ReactNode;

  /** Optional element rendered at the right edge, e.g. a unit ("kg") or a button. */
  endAdornment?: ReactNode;

  /**
   * Visual density. "default" preserves the original size used across the
   * app; "compact" is a tighter variant for dense forms (e.g. the billing
   * form) and does not change behavior/validation.
   */
  size?: "default" | "compact";
}

/**
 * Flat, square text field.
 *
 * - No rounded corners and no box border: the field is a filled surface with a
 *   thin baseline underneath that grows into a brand-coloured line on focus.
 * - Error state turns the baseline and tint red; disabled / read-only fields
 *   look visibly inert.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      hi,
      error,
      helperText,
      startIcon,
      endAdornment,
      id,
      required,
      size = "default",
      ...props
    },
    ref
  ) => {
    const isCompact = size === "compact";
    const generatedId = useId();

    const inputId = id ?? generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    return (
      <div className="group w-full">
        {/* LABEL */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "mb-1 block text-[11px] font-semibold uppercase tracking-[0.05em] text-neutral-600",
              "transition-colors group-focus-within:text-brand-700",
              error && "text-error-600 group-focus-within:text-error-600",
              isCompact && "mb-0.5 text-[10px] tracking-[0.03em]"
            )}
          >
            {label}
            {hi && (
              <span className="ml-1 text-[11px] font-medium normal-case tracking-normal text-neutral-500">
                ({hi})
              </span>
            )}
            {required && <span className="ml-1 text-error-600">*</span>}
          </label>
        )}

        {/* FIELD */}
        <div className="relative">
          {startIcon && (
            <span
              className={cn(
                "pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-neutral-400",
                "transition-colors group-focus-within:text-brand-600",
                error && "text-error-500 group-focus-within:text-error-500",
                isCompact && "left-2"
              )}
            >
              {startIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            required={required}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              // Base: flat filled surface, square, no border
              "block h-10 w-full rounded-none border-0 bg-neutral-100 px-3",
              "text-[13px] font-medium text-neutral-900 outline-none",
              "transition-colors duration-150",

              // Placeholder
              "placeholder:font-normal placeholder:text-neutral-400",

              // Hover / focus surface
              "hover:bg-neutral-200/60 focus:bg-white",

              // Disabled / read-only
              "disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 disabled:hover:bg-neutral-100",
              "read-only:cursor-default read-only:bg-transparent read-only:hover:bg-transparent",

              // Autofill shouldn't paint the browser's yellow over the surface
              "autofill:shadow-[inset_0_0_0_1000px_var(--color-neutral-100)]",

              // Spacing for adornments
              startIcon && "pl-10",
              endAdornment && "pr-12",

              // Compact density
              isCompact && "h-8 px-2 text-[12px]",
              isCompact && startIcon && "pl-7",
              isCompact && endAdornment && "pr-9",

              // Error tint
              error && "bg-error-50 hover:bg-error-50 focus:bg-white",
              error && "uts-shake",

              className
            )}
            {...props}
          />

          {endAdornment && (
            <span
              className={cn(
                "absolute right-0 top-0 z-10 flex h-full items-center px-3 text-[12px] font-medium text-neutral-500",
                isCompact && "px-2 text-[11px]"
              )}
            >
              {endAdornment}
            </span>
          )}

          {/* Baseline: thin rest line + animated focus line (replaces the box border) */}
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 h-px bg-neutral-300",
              "transition-colors group-hover:bg-neutral-400",
              error && "bg-error-500 group-hover:bg-error-500"
            )}
          />
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-brand-600",
              "transition-transform duration-200 ease-out group-focus-within:scale-x-100",
              error && "scale-x-100 bg-error-500"
            )}
          />
        </div>

        {/* ERROR / HELPER */}
        {error ? (
          <p
            id={errorId}
            role="alert"
            className={cn(
              "uts-pop mt-1 text-[11px] font-medium text-error-600",
              isCompact && "mt-0.5 text-[10px]"
            )}
          >
            {error}
          </p>
        ) : helperText ? (
          <p
            id={helperId}
            className={cn(
              "mt-1 text-[11px] leading-4 text-neutral-500",
              isCompact && "mt-0.5 text-[10px] leading-tight"
            )}
          >
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";