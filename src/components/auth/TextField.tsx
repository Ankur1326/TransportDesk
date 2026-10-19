"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(({ label, error, className, id, ...props }, ref) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-body-sm font-medium text-neutral-800">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "focus-ring h-11 w-full rounded-lg border bg-white px-3.5 text-body text-neutral-900 placeholder:text-neutral-400 transition-colors",
          error ? "border-error-500" : "border-neutral-300 hover:border-neutral-400 focus:border-brand-600",
          className
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-body-sm text-error-600">
          {error}
        </p>
      )}
    </div>
  );
});
TextField.displayName = "TextField";
