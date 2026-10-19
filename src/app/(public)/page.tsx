import type { Metadata } from "next";
import { Hero } from "@/components/public/home/Hero";
import { Highlights } from "@/components/public/home/Highlights";
import { FeatureGrid } from "@/components/public/home/FeatureGrid";
import { HowItWorks } from "@/components/public/home/HowItWorks";
import { Faq } from "@/components/public/home/Faq";
import { CtaSection } from "@/components/public/CtaSection";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: { absolute: `${brand.name} | Transport management software` },
  description: brand.description,
  openGraph: {
    title: `${brand.name} | Transport management software`,
    description: brand.description,
    type: "website",
  },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Highlights />
      <FeatureGrid />
      <HowItWorks />
      <Faq />
      <CtaSection />
    </>
  );
}
