import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

interface InputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;

  /** Hindi meaning shown in brackets after the label, e.g. "पैकेज". */
  hi?: string;

  /** Validation error message */
  error?: string;

  helperText?: string;

  /** Optional icon rendered inside the input */
  startIcon?: React.ReactNode;

  /**
   * Visual density. "default" preserves the original size used across the
   * app; "compact" is a tighter variant for dense forms (e.g. the billing
   * form) and does not change behavior/validation.
   */
  size?: any
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      hi,
      error,
      helperText,
      startIcon,
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
      <div className="w-full">
        {/* ========================================================== */}
        {/* LABEL                                                        */}
        {/* ========================================================== */}

        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-neutral-600",
              isCompact && "mb-0.5 text-[9.5px] tracking-[0.02em]"
            )}
          >
            {label}
            {hi && <span className="ml-1 text-[11px] font-medium normal-case tracking-normal text-neutral-500">({hi})</span>}

            {required && (
              <span className="ml-1 text-error-600">
                *
              </span>
            )}
          </label>
        )}

        {/* ========================================================== */}
        {/* INPUT                                                        */}
        {/* ========================================================== */}

        <div className="relative">
          {/* Start Icon */}
          {startIcon && (
            <span
              className={cn(
                "pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-neutral-400",
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
            aria-describedby={
              error
                ? errorId
                : helperText
                  ? helperId
                  : undefined
            }
            className={cn(
              // Base
              `
                h-10
                w-full
                border
                border-neutral-300
                bg-neutral-50
                px-3
                text-[13px]
                font-medium
                text-neutral-900
                outline-none
              `,

              // Placeholder
              `
                placeholder:text-neutral-400
                placeholder:font-normal
              `,

              // Hover
              `
                hover:border-neutral-400
                hover:bg-white
              `,

              // Focus
              `
                focus:border-brand-600
                focus:bg-white
                focus:ring-1
                focus:ring-brand-600
              `,

              // Transition
              `
                transition-colors
              `,

              // Icon spacing
              startIcon && "pl-10",

              // Compact density
              isCompact && "h-8 px-2 text-[12px]",
              isCompact && startIcon && "pl-7",

              // Error state
              error &&
              `
                  border-error-500
                  bg-error-50
                  hover:border-error-500
                  focus:border-error-500
                  focus:bg-white
                  focus:ring-error-500
                `,

              className
            )}
            {...props}
          />
        </div>

        {/* ========================================================== */}
        {/* ERROR                                                        */}
        {/* ========================================================== */}

        {error ? (
          <p
            id={errorId}
            className={cn(
              "mt-1.5 text-[11px] font-medium text-error-600",
              isCompact && "mt-0.5 text-[10px]"
            )}
          >
            {error}
          </p>
        ) : helperText ? (
          <p
            id={helperId}
            className={cn(
              "mt-1.5 text-[11px] leading-4 text-neutral-500",
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