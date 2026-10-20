import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { NotFoundActions } from "@/components/layout/NotFoundActions";
import { NotFoundIllustration } from "@/components/layout/NotFoundIllustration";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you're looking for doesn't exist or has moved.",
};

/**
 * Shown for any URL that doesn't match a route (and whenever a page calls
 * notFound()). Next.js sends the 404 status and noindex for us.
 */
export default function NotFound() {
  return (
    <div className="public-site flex min-h-screen flex-col bg-white text-neutral-900">
      <PublicHeader />
      <main id="main" className="flex flex-1 items-center">
        <Container className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-caption font-semibold uppercase tracking-wide text-brand-800">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
              Error 404
            </span>
            <h1 className="mt-4">This route doesn&apos;t exist</h1>
            <p className="mt-4 max-w-md text-lead text-neutral-600">
              We couldn&apos;t find the page you were looking for. It may have been moved or deleted, or the link could be mistyped.
            </p>
            <NotFoundActions />
          </div>

          <div className="order-1 mx-auto w-full max-w-sm sm:max-w-md lg:order-2 lg:max-w-none">
            <NotFoundIllustration className="h-auto w-full" />
          </div>
        </Container>
      </main>
      <PublicFooter />
    </div>
  );
}
