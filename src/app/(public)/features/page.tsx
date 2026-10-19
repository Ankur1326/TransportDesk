import type { Metadata } from "next";
import { CheckCircle2 } from "@/components/icons";
import { Section } from "@/components/layout/Section";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { CtaSection } from "@/components/public/CtaSection";
import { features } from "@/lib/marketing";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Features",
  description: "Lorry receipts, GST freight bills, delivery tracking, parties and company branding — everything a transport office needs.",
};

export default function FeaturesPage() {
  return (
    <>
      <Section background="muted" spacing="md">
        <SectionHeading
          eyebrow="Features"
          title="Everything your transport office needs"
          description="Each tool below is part of the dashboard today — no add-ons to buy and nothing to install."
        />
      </Section>

      {features.map(({ id, icon: Icon, title, summary, details }, index) => (
        <Section key={id} id={id} background={index % 2 === 0 ? "white" : "muted"} spacing="md" className="scroll-mt-16">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className={cn(index % 2 === 1 && "lg:order-2")}>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="mt-5">{title}</h2>
              <p className="mt-3 text-lead text-neutral-600">{summary}</p>
            </div>

            <ul className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
              {details.map((line) => (
                <li key={line} className="flex items-start gap-3 text-body text-neutral-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-600" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ))}

      <CtaSection />
    </>
  );
}
