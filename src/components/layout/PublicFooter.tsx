import Link from "next/link";
import { Mail, MessageCircle, Phone } from "@/components/icons";
import { BrandMark } from "@/components/auth/BrandMark";
import { Container } from "@/components/layout/Container";
import { brand } from "@/lib/brand";

function FooterColumn({ title, links }: { title: string; links: readonly { href: string; label: string }[] }) {
  return (
    <div>
      <h3 className="text-body-sm font-semibold uppercase tracking-wide text-white">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="focus-ring rounded text-body-sm text-neutral-400 hover:text-white">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="on-dark bg-brand-950 text-neutral-300">
      <Container className="py-14 md:py-16">
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-4">
          <div className="col-span-2 max-w-sm">
            <BrandMark tone="light" />
            <p className="mt-4 text-body-sm text-neutral-400">{brand.tagline}</p>
          </div>

          <FooterColumn title="Product" links={brand.footerProduct} />
          <FooterColumn title="Company" links={brand.footerCompany} />
        </div>

        {(brand.supportEmail || brand.supportPhone || brand.whatsapp) && (
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-8 text-body-sm text-neutral-400">
            {brand.supportEmail && (
              <li>
                <a href={`mailto:${brand.supportEmail}`} className="focus-ring inline-flex items-center gap-2 rounded hover:text-white">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {brand.supportEmail}
                </a>
              </li>
            )}
            {brand.supportPhone && (
              <li>
                <a href={`tel:${brand.supportPhone.replace(/[^\d+]/g, "")}`} className="focus-ring inline-flex items-center gap-2 rounded hover:text-white">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {brand.supportPhone}
                </a>
              </li>
            )}
            {brand.whatsapp && (
              <li>
                <a
                  href={`https://wa.me/${brand.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring inline-flex items-center gap-2 rounded hover:text-white"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  WhatsApp
                </a>
              </li>
            )}
          </ul>
        )}

        <div className="mt-10 border-t border-white/10 pt-6 text-caption text-neutral-500">
          <p>
            &copy; {year} {brand.name}. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
