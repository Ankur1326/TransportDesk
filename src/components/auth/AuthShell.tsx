import Link from "next/link";
import { CheckCircle2, FileText, ShieldCheck, Zap } from "@/components/icons";
import { BrandMark } from "@/components/auth/BrandMark";
import { brand } from "@/lib/brand";

const highlights = [
  { icon: FileText, text: "Create and print LRs in the format you prefer" },
  { icon: Zap, text: "Generate GST freight bills in a few clicks" },
  { icon: ShieldCheck, text: "Your company's data stays private to your account" },
];

interface AuthShellProps {
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Two-column auth layout: brand panel on large screens, centered form card
 * everywhere. Shared by sign-in and sign-up so they always look consistent.
 */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-700/30 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl" />

        <BrandMark tone="light" className="relative" />

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Run your transport business without the paperwork.
          </h2>
          <ul className="mt-8 space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-neutral-200">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-body">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-caption text-neutral-400">
          &copy; {new Date().getFullYear()} {brand.name}
        </p>
      </aside>

      {/* Form column */}
      <main className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between lg:justify-end">
          <BrandMark className="lg:hidden" />
          <Link href="/" className="focus-ring rounded-md px-2 py-1 text-body-sm font-medium text-neutral-600 hover:text-brand-700">
            &larr; Back to home
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-neutral-900">{title}</h1>
          <p className="mt-2 text-body text-neutral-600">{subtitle}</p>

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-8 text-center text-body-sm text-neutral-600">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

export function AuthAlert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "border-error-100 bg-error-50 text-error-700",
    success: "border-success-100 bg-success-50 text-success-700",
    info: "border-info-100 bg-info-50 text-info-700",
  } as const;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-body-sm ${styles[tone]}`}>
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
