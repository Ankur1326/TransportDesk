"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PackageSearch, ArrowRight } from "@/components/icons";
import { Section } from "@/components/layout/Section";
import { Button } from "@/components/Button";

export function TrackingCta() {
  const router = useRouter();
  const [trackingId, setTrackingId] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    router.push(trackingId ? `/track?id=${encodeURIComponent(trackingId)}` : "/track");
  }

  return (
    <Section background="white" spacing="md">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-10 text-center sm:px-12 lg:flex-row lg:justify-between lg:text-left">
        <div className="flex items-center gap-4">
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 sm:flex">
            <PackageSearch className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-h3">Already shipping with us?</h2>
            <p className="mt-1 text-body-sm text-neutral-500">
              Enter your tracking ID to see your shipment's current status.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row" aria-label="Track shipment">
          <label htmlFor="tracking-id" className="sr-only">
            Tracking ID
          </label>
          <input
            id="tracking-id"
            type="text"
            placeholder="e.g. TC-204981"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            className="focus-ring h-12 w-full flex-1 rounded-lg border border-neutral-300 bg-white px-4 text-body text-neutral-900 placeholder:text-neutral-400 hover:border-neutral-400"
          />
          <Button type="submit" size="lg" className="shrink-0">
            Track Shipment
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>
      </div>
    </Section>
  );
}