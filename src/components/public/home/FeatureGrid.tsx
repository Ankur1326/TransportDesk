import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { Section } from "@/components/layout/Section";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { features } from "@/lib/marketing";

export function FeatureGrid({ showLink = true }: { showLink?: boolean }) {
  return (
    <Section background="white" spacing="md" id="features">
      <SectionHeading
        eyebrow="Everything in one place"
        title="The tools a transport office uses every day"
        description="From the moment goods are booked to the moment the bill is paid, each step has a place."
      />

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.slice(0, 6).map(({ id, icon: Icon, title, summary }) => (
          <article
            key={id}
            className="group rounded-2xl border border-neutral-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-700 group-hover:text-white">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-5">{title}</h3>
            <p className="mt-2 text-body-sm text-neutral-600">{summary}</p>
          </article>
        ))}
      </div>

      {showLink && (
        <div className="mt-10 text-center">
          <Link
            href="/features"
            className="focus-ring inline-flex items-center gap-1.5 rounded-md text-body font-semibold text-brand-700 hover:text-brand-800"
          >
            See all features
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </Section>
  );
}
