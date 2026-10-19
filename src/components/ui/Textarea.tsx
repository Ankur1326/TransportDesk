import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  /** Hindi meaning shown in brackets after the label. */
  hi?: string;
  error?: string;
  helperText?: string;
  /**
   * Visual density. "default" preserves the original size used across the
   * app; "compact" is a tighter variant for dense forms (e.g. the billing
   * form) and does not change behavior/validation.
   */
  size?: "default" | "compact";
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hi, error, helperText, id, required, rows = 3, size = "default", ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const helperId = `${textareaId}-helper`;
    const errorId = `${textareaId}-error`;
    const isCompact = size === "compact";

    return (
      <div className="group w-full">
        {label && (
          <label
            htmlFor={textareaId}
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

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            "focus-ring w-full resize-y rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-body text-neutral-900 placeholder:text-neutral-400",
            "transition-colors hover:border-neutral-400",
            isCompact && "rounded-md px-2 py-1.5 text-[12px]",
            error && "uts-shake border-error-500 hover:border-error-500 focus-visible:ring-error-500",
            className
          )}
          {...props}
        />

        {error ? (
          <p id={errorId} className={cn("uts-pop mt-1.5 text-body-sm text-error-600", isCompact && "mt-0.5 text-[10px]")}>
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className={cn("mt-1.5 text-body-sm text-neutral-500", isCompact && "mt-0.5 text-[10px] leading-tight")}>
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";