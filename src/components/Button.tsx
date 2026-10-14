import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "@/components/icons";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and disables the button — use during async submits. */
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "app-button-primary",
  secondary: "app-button-secondary",
  outline: "border border-neutral-300 bg-white text-neutral-800 shadow-sm hover:bg-neutral-50 hover:shadow",
  ghost: "text-neutral-700 hover:bg-neutral-100",
  danger: "bg-error-600 text-white hover:bg-error-700",
  link: "text-brand-700 underline-offset-4 hover:underline p-0 h-auto",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={cn(
          "focus-ring inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
          variant !== "link" && sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";