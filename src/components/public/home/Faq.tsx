import { ChevronDown } from "@/components/icons";
import { Section } from "@/components/layout/Section";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { faqs } from "@/lib/marketing";

/** Native <details> accordion: keyboard accessible, no client JS. */
export function Faq() {
  return (
    <Section background="white" spacing="md" id="faq" className="scroll-mt-16" containerClassName="max-w-3xl">
      <SectionHeading eyebrow="FAQ" title="Questions, answered" />

      <div className="mt-10 divide-y divide-neutral-200 rounded-2xl border border-neutral-200">
        {faqs.map((item) => (
          <details key={item.q} className="group px-5 py-1 open:bg-neutral-50/60">
            <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-4 text-body font-semibold text-neutral-900 [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown
                className="h-5 w-5 shrink-0 text-neutral-500 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="pb-4 pr-8 text-body-sm text-neutral-600">{item.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
