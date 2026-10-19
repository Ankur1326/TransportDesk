import type { Metadata } from "next";
import { Section } from "@/components/layout/Section";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { CtaSection } from "@/components/public/CtaSection";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "About",
  description: `Why we built ${brand.name} and who it's for.`,
};

const principles = [
  {
    title: "Made for how transport offices work",
    body: "Lorry receipts, freight bills, parties and delivery status are the daily routine. They are the centre of the product, not an afterthought.",
  },
  {
    title: "Your brand, not ours",
    body: "Documents carry your company name, logo, GST details and terms. Customers see your business.",
  },
  {
    title: "Simple enough for the whole team",
    body: "Clear forms, helpful validation and Hindi labels where they matter, so new staff can be productive on day one.",
  },
  {
    title: "Your data stays yours",
    body: "Every company's records are kept separate and are only visible after signing in to that company's account.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Section background="muted" spacing="md">
        <SectionHeading
          eyebrow="About"
          title={`${brand.name} is software for transport companies`}
          description="We want running a transport business to feel less like paperwork and more like running a business."
        />
      </Section>

      <Section background="white" spacing="md" containerClassName="max-w-3xl">
        <div className="space-y-5 text-lead text-neutral-700">
          <p>
            Transport offices still run on bilty books, calculators and spreadsheets. Numbers get duplicated, copies go
            missing and chasing a delivery status means a phone call.
          </p>
          <p>
            {brand.name} puts the essentials in one dashboard: create the LR, print the copies each party needs, follow the
            consignment until it&apos;s delivered, and turn finished work into a freight bill.
          </p>
        </div>
      </Section>

      <Section background="muted" spacing="md">
        <SectionHeading title="What we care about" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {principles.map((item) => (
            <article key={item.title} className="rounded-2xl border border-neutral-200 bg-white p-6">
              <h3>{item.title}</h3>
              <p className="mt-2 text-body-sm text-neutral-600">{item.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <CtaSection />
    </>
  );
}
