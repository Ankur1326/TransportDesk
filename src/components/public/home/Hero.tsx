import Link from "next/link";
import { ArrowRight, PhoneCall, ShieldCheck } from "@/components/icons";
import { Section } from "@/components/layout/Section";
import { RouteIllustration } from "@/components/public/home/RouteIllustration";
import { trustStats } from "@/lib/placeholder-data";

export function Hero() {
  return (
    <Section background="muted" spacing="lg" className="overflow-hidden">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Copy */}
        <div>
          <span className="eyebrow inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Trusted Freight Partner
          </span>

          <h1 className="mt-4">
            Freight delivered on time, <span className="text-brand-700">every time.</span>
          </h1>

          <p className="mt-5 max-w-lg text-lead text-neutral-600">
            From single-city drops to full-truckload freight, we plan the route, assign a
            vetted driver, and keep you updated until it's signed for.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/quote"
              className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand-700 px-6 text-body font-medium text-white hover:bg-brand-800"
            >
              Get a Quote
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/contact"
              className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-6 text-body font-medium text-neutral-800 hover:bg-neutral-50"
            >
              <PhoneCall className="h-4 w-4" aria-hidden="true" />
              Contact Us
            </Link>
          </div>

          {/* Trust indicators */}
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-neutral-200 pt-8 sm:grid-cols-4 sm:gap-x-4">
            {trustStats.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd className="text-h3 font-bold text-brand-800">{stat.value}</dd>
                <dd className="mt-0.5 text-caption text-neutral-500">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Illustration */}
        <div className="relative">
          <RouteIllustration className="max-w-md lg:max-w-none" />

          <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-card sm:left-8">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-50 text-success-600">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-body-sm font-semibold text-neutral-900">On-Time Guarantee</p>
              <p className="text-caption text-neutral-500">Tracked from pickup to delivery</p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}