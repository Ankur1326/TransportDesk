import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "@/components/icons";
import { Container } from "@/components/layout/Container";
import { ProductPreview } from "@/components/public/ProductPreview";
import { SIGN_IN_HREF, SIGN_UP_HREF } from "@/lib/brand";

const points = ["Lorry receipts & GST freight bills", "Delivery status and proof of delivery", "Your company name on every document"];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-0 opacity-[0.35] [background-image:radial-gradient(var(--color-brand-200)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]"
      />

      <Container className="relative grid items-center gap-14 py-16 md:py-24 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:py-28">
        <div className="pub-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-caption font-semibold text-brand-800 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
            Built for transport companies
          </span>

          <h1 className="mt-5">
            Run your transport business from <span className="text-brand-700">one dashboard.</span>
          </h1>

          <p className="mt-5 max-w-xl text-lead text-neutral-600">
            Create lorry receipts, raise GST freight bills, follow every booking to delivery and keep your parties organised —
            without paper books or scattered spreadsheets.
          </p>

          <ul className="mt-6 space-y-2.5">
            {points.map((point) => (
              <li key={point} className="flex items-center gap-2.5 text-body text-neutral-700">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success-600" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href={SIGN_UP_HREF}
              className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand-700 px-6 text-body font-semibold text-white shadow-sm transition hover:bg-brand-800"
            >
              Get started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={SIGN_IN_HREF}
              className="focus-ring inline-flex h-12 items-center justify-center rounded-lg border border-neutral-300 bg-white px-6 text-body font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Sign in
            </Link>
          </div>
        </div>

        <ProductPreview className="pub-fade-up [animation-delay:120ms] lg:pl-4" />
      </Container>
    </section>
  );
}
