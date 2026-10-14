import { MapPin } from "@/components/icons";
import { Section } from "@/components/layout/Section";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { serviceAreas } from "@/lib/placeholder-data";

// Fixed positions (in %) so the pins look intentionally scattered across
// the placeholder panel rather than randomly generated on every render.
const PIN_POSITIONS = [
  { x: 18, y: 30 },
  { x: 34, y: 62 },
  { x: 50, y: 22 },
  { x: 62, y: 48 },
  { x: 76, y: 28 },
  { x: 82, y: 66 },
  { x: 45, y: 78 },
  { x: 28, y: 85 },
];

export function ServiceAreas() {
  return (
    <Section background="muted" spacing="lg">
      <SectionHeading
        eyebrow="Service Areas"
        title="Wherever your business ships, we're already there"
        description="Regular routes across major cities and industrial hubs, with new lanes added as demand grows."
      />

      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <div className="flex flex-wrap gap-2.5">
            {serviceAreas.map((city) => (
              <span
                key={city}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1.5 text-body-sm font-medium text-brand-800"
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {city}
              </span>
            ))}
          </div>
          <p className="mt-6 text-body-sm text-neutral-500">
            Don't see your city? <a href="/contact" className="focus-ring font-medium text-brand-700 hover:underline">Get in touch</a> — we're regularly expanding our coverage.
          </p>
        </div>

        {/* Abstract coverage-map placeholder (illustrative, not to scale) */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <pattern id="grid-dots" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.5" fill="#eceef1" />
              </pattern>
            </defs>
            <rect width="400" height="300" fill="url(#grid-dots)" />
            <path d="M72,90 Q140,60 200,130 T328,110" stroke="#f7900a" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" fill="none" />
            <path d="M136,186 Q220,150 260,200 T328,110" stroke="#f7900a" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" fill="none" />
          </svg>

          {PIN_POSITIONS.map((pos, i) => (
            <span
              key={i}
              className="absolute flex h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-brand-700 shadow-card"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            />
          ))}

          <div className="absolute bottom-3 right-3 rounded-lg bg-white/90 px-3 py-1.5 text-caption font-medium text-neutral-500 backdrop-blur">
            Illustrative coverage map
          </div>
        </div>
      </div>
    </Section>
  );
}