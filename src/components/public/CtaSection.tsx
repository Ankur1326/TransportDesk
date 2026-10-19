import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { Section } from "@/components/layout/Section";
import { SIGN_IN_HREF, SIGN_UP_HREF } from "@/lib/brand";

interface CtaSectionProps {
  title?: string;
  description?: string;
}

/** Closing call-to-action banner for the bottom of any public page. */
export function CtaSection({
  title = "Ready to simplify your transport office?",
  description = "Create your account and issue your first lorry receipt today.",
}: CtaSectionProps) {
  return (
    <Section background="brand" spacing="lg" className="on-dark">
      <div className="flex flex-col items-center text-center">
        <span className="route-divider" aria-hidden="true" />
        <h2 className="mt-6 max-w-2xl">{title}</h2>
        <p className="mt-3 max-w-xl text-body text-neutral-300">{description}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={SIGN_UP_HREF}
            className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-body font-semibold text-brand-900 transition hover:bg-brand-50"
          >
            Get started
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href={SIGN_IN_HREF}
            className="focus-ring inline-flex h-12 items-center justify-center rounded-lg border border-white/30 px-6 text-body font-semibold text-white transition hover:bg-white/10"
          >
            Sign in
          </Link>
        </div>
      </div>
    </Section>
  );
}
