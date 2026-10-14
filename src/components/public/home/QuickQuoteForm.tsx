"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Truck, CalendarDays, ArrowRight } from "@/components/icons";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/Button";
import { vehicleTypeOptions } from "@/lib/placeholder-data";
import { cn } from "@/lib/utils";

const fieldClasses =
  "focus-ring h-11 w-full rounded-lg border border-neutral-300 bg-white pl-10 pr-3 text-body text-neutral-900 placeholder:text-neutral-400 transition-colors hover:border-neutral-400";

/**
 * Quick quote widget: collects pickup/delivery/vehicle/date and forwards
 * to the Get a Quote page with those values pre-filled as query params.
 * No API call yet — the /quote page (built in a later step) will read
 * these params and own the actual submission.
 */
export function QuickQuoteForm() {
  const router = useRouter();
  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [date, setDate] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (pickup) params.set("pickup", pickup);
    if (delivery) params.set("delivery", delivery);
    if (vehicleType) params.set("vehicle", vehicleType);
    if (date) params.set("date", date);
    router.push(`/quote${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <Card padding="lg" className="relative z-10 -mt-16 md:-mt-20">
      <form onSubmit={handleSubmit} aria-label="Quick quote request">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label htmlFor="qq-pickup" className="mb-1.5 block text-body-sm font-medium text-neutral-800">
              Pickup Location
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
              <input
                id="qq-pickup"
                type="text"
                placeholder="e.g. Jaipur"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                className={fieldClasses}
              />
            </div>
          </div>

          <div>
            <label htmlFor="qq-delivery" className="mb-1.5 block text-body-sm font-medium text-neutral-800">
              Delivery Location
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
              <input
                id="qq-delivery"
                type="text"
                placeholder="e.g. Ahmedabad"
                value={delivery}
                onChange={(e) => setDelivery(e.target.value)}
                className={fieldClasses}
              />
            </div>
          </div>

          <div>
            <label htmlFor="qq-vehicle" className="mb-1.5 block text-body-sm font-medium text-neutral-800">
              Vehicle Type
            </label>
            <div className="relative">
              <Truck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
              <select
                id="qq-vehicle"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className={cn(fieldClasses, "appearance-none pr-8", !vehicleType && "text-neutral-400")}
              >
                <option value="">Any vehicle</option>
                {vehicleTypeOptions.map((option) => (
                  <option key={option.value} value={option.value} className="text-neutral-900">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="qq-date" className="mb-1.5 block text-body-sm font-medium text-neutral-800">
              Pickup Date
            </label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
              <input
                id="qq-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={fieldClasses}
              />
            </div>
          </div>
        </div>

        <Button type="submit" size="lg" className="mt-5 w-full md:w-auto text-brand-700 bg-brand-700 hover:bg-brand-800 focus:ring-brand-700 cursor-pointer">
          Get Instant Quote
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
    </Card>
  );
}