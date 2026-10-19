"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "@/components/icons";
import { cn } from "@/lib/utils";

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
}

/** Password input with a show/hide toggle and an accessible label + error. */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;

    return (
      <div>
        <label htmlFor={inputId} className="mb-1.5 block text-body-sm font-medium text-neutral-800">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              "focus-ring h-11 w-full rounded-lg border bg-white px-3.5 pr-11 text-body text-neutral-900 placeholder:text-neutral-400 transition-colors",
              error ? "border-error-500" : "border-neutral-300 hover:border-neutral-400 focus:border-brand-600",
              className
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="focus-ring absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
          >
            {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-body-sm text-error-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);
PasswordField.displayName = "PasswordField";
