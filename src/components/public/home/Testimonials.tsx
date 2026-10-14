import { Star } from "@/components/icons";
import { Section } from "@/components/layout/Section";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Card } from "@/components/ui/Card";
import { testimonials } from "@/lib/placeholder-data";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`Rated ${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={i < rating ? "h-4 w-4 fill-accent-500 text-accent-500" : "h-4 w-4 text-neutral-200"}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <Section background="white" spacing="lg">
      <SectionHeading
        eyebrow="Testimonials"
        title="What our customers say"
        description="Real feedback from businesses that ship with us regularly."
      />

      <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
        {testimonials.map((t) => (
          <Card key={t.name} padding="lg" className="flex flex-col">
            <StarRating rating={t.rating} />
            <p className="mt-4 flex-1 text-body-sm text-neutral-600">&ldquo;{t.review}&rdquo;</p>
            <div className="mt-5 flex items-center gap-3 border-t border-neutral-100 pt-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-body-sm font-semibold text-brand-700">
                {t.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </span>
              <div>
                <p className="text-body-sm font-semibold text-neutral-900">{t.name}</p>
                <p className="text-caption text-neutral-500">{t.role}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}