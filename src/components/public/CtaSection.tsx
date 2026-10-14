import Link from "next/link";
import { ArrowRight, Phone, MessageCircle } from "@/components/icons";
import { Section } from "@/components/layout/Section";
import { buildTelLink, buildWhatsAppLink } from "@/lib/site-config";

interface CtaSectionProps {
    title?: string;
    description?: string;
    primaryHref?: string;
    primaryLabel?: string;
    showCallAction?: boolean;
    showWhatsAppAction?: boolean;
}

/**
 * Drop-in CTA banner for the bottom of any public page (Home, Services,
 * Fleet, etc.) — dark brand background with the route-divider signature
 * motif, a primary "Get a Quote" action, and optional call/WhatsApp
 * actions.
 */
export function CtaSection({
    title = "Ready to move your freight?",
    description = "Tell us what you need to ship and we'll get back to you with a quote within one business day.",
    primaryHref = "/quote",
    primaryLabel = "Get a Free Quote",
    showCallAction = true,
    showWhatsAppAction = false,
}: CtaSectionProps) {
    return (
        <Section background="brand" spacing="lg" className="text-black">
            <div className="flex flex-col items-center text-center">
                <span className="route-divider" aria-hidden="true" />
                <h2 className="mt-6">{title}</h2>
                <p className="mt-3 max-w-xl text-body text-neutral-300">{description}</p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link
                        href={primaryHref}
                        className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-6 text-body font-medium text-white hover:bg-accent-600"
                    >
                        {primaryLabel}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>

                    {showCallAction && (
                        <a
                            href={buildTelLink()}
                            className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/30 px-6 text-body font-medium text-white hover:bg-white/10"
                        >
                            <Phone className="h-4 w-4" aria-hidden="true" />
                            Call Now
                        </a>
                    )}

                    {showWhatsAppAction && (
                        <a
                            href={buildWhatsAppLink("Hi! I'd like to get a shipping quote.")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/30 px-6 text-body font-medium text-white hover:bg-white/10"
                        >
                            <MessageCircle className="h-4 w-4" aria-hidden="true" />
                            WhatsApp
                        </a>
                    )}
                </div>
            </div>
        </Section>
    );
}