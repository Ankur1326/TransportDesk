import Link from "next/link";
import { ArrowRight, PackageCheck } from "@/components/icons";
import { Section } from "@/components/layout/Section";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Card } from "@/components/ui/Card";
import { VehicleIllustration } from "@/components/public/home/VehicleIllustration";
import { fleet } from "@/lib/placeholder-data";

export function FleetPreview() {
  return (
    <Section background="white" spacing="lg">
      <SectionHeading
        eyebrow="Our Fleet"
        title="The right vehicle for every shipment"
        description="A well-maintained, GPS-equipped fleet ranging from mini trucks to full container trucks."
      />

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {fleet.map((vehicle) => (
          <Card key={vehicle.slug} padding="none" interactive className="overflow-hidden">
            <div className="flex items-center justify-center bg-neutral-50 px-6 py-8">
              <VehicleIllustration variant={vehicle.illustration} className="max-w-[180px]" />
            </div>
            <div className="p-5">
              <h3 className="text-h4 font-semibold text-neutral-900">{vehicle.type}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-body-sm font-medium text-brand-700">
                <PackageCheck className="h-4 w-4" aria-hidden="true" />
                {vehicle.capacity}
              </p>
              <p className="mt-2 text-body-sm text-neutral-500">{vehicle.description}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/fleet"
          className="focus-ring inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-6 text-body-sm font-medium text-white hover:bg-brand-800"
        >
          View Full Fleet
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </Section>
  );
}