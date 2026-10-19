import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, Phone } from "@/components/icons";
import { Section } from "@/components/layout/Section";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { brand, SIGN_IN_HREF, SIGN_UP_HREF } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with the ${brand.name} team.`,
};

export default function ContactPage() {
  const channels = [
    brand.supportEmail && {
      key: "email",
      icon: Mail,
      title: "Email",
      value: brand.supportEmail,
      href: `mailto:${brand.supportEmail}`,
    },
    brand.supportPhone && {
      key: "phone",
      icon: Phone,
      title: "Phone",
      value: brand.supportPhone,
      href: `tel:${brand.supportPhone.replace(/[^\d+]/g, "")}`,
    },
    brand.whatsapp && {
      key: "whatsapp",
      icon: MessageCircle,
      title: "WhatsApp",
      value: "Message us",
      href: `https://wa.me/${brand.whatsapp}`,
    },
  ].filter(Boolean) as { key: string; icon: typeof Mail; title: string; value: string; href: string }[];

  return (
    <>
      <Section background="muted" spacing="md">
        <SectionHeading
          eyebrow="Contact"
          title="Talk to us"
          description="Questions about the product or help getting started? Reach out and we'll get back to you."
        />
      </Section>

      <Section background="white" spacing="md" containerClassName="max-w-3xl">
        {channels.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {channels.map(({ key, icon: Icon, title, value, href }) => (
              <li key={key}>
                <a
                  href={href}
                  target={key === "whatsapp" ? "_blank" : undefined}
                  rel={key === "whatsapp" ? "noopener noreferrer" : undefined}
                  className="focus-ring flex items-center gap-4 rounded-2xl border border-neutral-200 p-5 transition hover:border-brand-300 hover:shadow-card-hover"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-body-sm text-neutral-500">{title}</span>
                    <span className="block truncate text-body font-semibold text-neutral-900">{value}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-body text-neutral-600">
            Support details haven&apos;t been published yet. Once you&apos;re signed in you can reach us from your dashboard.
          </p>
        )}

        <div className="mt-10 rounded-2xl bg-neutral-50 p-6 text-center">
          <p className="text-body font-semibold text-neutral-900">New to {brand.name}?</p>
          <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={SIGN_UP_HREF}
              className="focus-ring inline-flex h-11 items-center justify-center rounded-lg bg-brand-700 px-5 text-body-sm font-semibold text-white hover:bg-brand-800"
            >
              Create an account
            </Link>
            <Link
              href={SIGN_IN_HREF}
              className="focus-ring inline-flex h-11 items-center justify-center rounded-lg border border-neutral-300 bg-white px-5 text-body-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              Sign in
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
