import Link from "next/link";
import { Truck, Phone, Mail, MapPin, MessageCircle } from "@/components/icons";
import { Container } from "@/components/layout/Container";
import { siteConfig, buildTelLink, buildWhatsAppLink } from "@/lib/site-config";

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-brand-950 text-neutral-300">
      <Container className="py-14 md:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Company info */}
          <div>
            <Link href="/" className="flex items-center gap-2 font-semibold text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700">
                <Truck className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-h4">{siteConfig.name}</span>
            </Link>
            <p className="mt-4 text-body-sm text-neutral-400">{siteConfig.tagline}</p>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-body-sm font-semibold uppercase tracking-wide text-white">Services</h3>
            <ul className="mt-4 space-y-2.5">
              {siteConfig.footerServices.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="focus-ring text-body-sm text-neutral-400 hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-body-sm font-semibold uppercase tracking-wide text-white">Quick Links</h3>
            <ul className="mt-4 space-y-2.5">
              {siteConfig.footerQuickLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="focus-ring text-body-sm text-neutral-400 hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-body-sm font-semibold uppercase tracking-wide text-white">Contact</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href={buildTelLink()}
                  className="focus-ring flex items-start gap-2.5 text-body-sm text-neutral-400 hover:text-white"
                >
                  <Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {siteConfig.phone}
                </a>
              </li>
              <li>
                <a
                  href={buildWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring flex items-start gap-2.5 text-body-sm text-neutral-400 hover:text-white"
                >
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  WhatsApp Us
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="focus-ring flex items-start gap-2.5 text-body-sm text-neutral-400 hover:text-white"
                >
                  <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {siteConfig.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-body-sm text-neutral-400">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {siteConfig.address}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-caption text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {year} {siteConfig.name}. All rights reserved.</p>
          <p>Built for reliable, on-time logistics.</p>
        </div>
      </Container>
    </footer>
  );
}