import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { Section } from "@/components/layout/Section";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { getIcon } from "@/components/public/home/icon-map";
import { services } from "@/lib/placeholder-data";

export function ServicesPreview() {
  return (
    <Section background="muted" spacing="lg">
      <SectionHeading
        eyebrow="Our Services"
        title="Freight solutions for every kind of load"
        description="From single-pallet part loads to full-truckload freight, choose the service that fits your shipment."
      />

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => {
          const Icon = getIcon(service.icon);
          return (
            <Card key={service.slug} interactive padding="lg" className="flex flex-col">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <CardTitle className="mt-4">{service.name}</CardTitle>
              <CardDescription>{service.description}</CardDescription>
              <Link
                href={`/services#${service.slug}`}
                className="focus-ring mt-5 inline-flex w-fit items-center gap-1.5 rounded-md text-body-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                Learn More
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Card>
          );
        })}
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/services"
          className="focus-ring inline-flex h-11 items-center justify-center rounded-lg border border-neutral-300 bg-white px-6 text-body-sm font-medium text-neutral-800 hover:bg-neutral-50"
        >
          View All Services
        </Link>
      </div>
    </Section>
  );
}