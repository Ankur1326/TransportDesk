"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "@/components/icons";

/**
 * Only rendered when NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true (and the server has
 * GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET set), so people never see a button
 * that can't work.
 */
export const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

export function GoogleButton({ callbackUrl, label = "Continue with Google" }: { callbackUrl: string; label?: string }) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        void signIn("google", { callbackUrl });
      }}
      className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-neutral-300 bg-white text-body-sm font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3a7.2 7.2 0 0 1-10.7-3.78H1.35v3.09A12 12 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.37 14.3a7.2 7.2 0 0 1 0-4.6V6.61H1.35a12 12 0 0 0 0 10.78l4.02-3.09z" />
          <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.43-3.43A11.95 11.95 0 0 0 12 0 12 12 0 0 0 1.35 6.61l4.02 3.09A7.16 7.16 0 0 1 12 4.77z" />
        </svg>
      )}
      {label}
    </button>
  );
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3 text-caption uppercase tracking-wider text-neutral-400" role="separator">
      <span className="h-px flex-1 bg-neutral-200" />
      or
      <span className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}
