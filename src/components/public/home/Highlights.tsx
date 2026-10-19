import { Section } from "@/components/layout/Section";
import { highlights } from "@/lib/marketing";

/** Compact strip of capability chips between the feature grid and "how it works". */
export function Highlights() {
  return (
    <Section background="white" spacing="sm" className="border-y border-neutral-100">
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {highlights.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-3 text-body-sm font-medium text-neutral-700">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            {label}
          </li>
        ))}
      </ul>
    </Section>
  );
}
