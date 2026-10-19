import { Section } from "@/components/layout/Section";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { steps } from "@/lib/marketing";

export function HowItWorks() {
  return (
    <Section background="muted" spacing="md" id="how-it-works" className="scroll-mt-16">
      <SectionHeading
        eyebrow="How it works"
        title="Up and running in three steps"
        description="No installation and no training sessions — just sign up and start issuing LRs."
      />

      <ol className="mt-12 grid gap-8 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="relative">
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-700 text-lg font-bold text-white shadow-sm">
                {index + 1}
              </span>
              {index < steps.length - 1 && (
                <span aria-hidden="true" className="hidden h-px flex-1 border-t-2 border-dashed border-brand-200 md:block" />
              )}
            </div>
            <h3 className="mt-5">{step.title}</h3>
            <p className="mt-2 text-body-sm text-neutral-600">{step.description}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
