"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import type { ApiErrorInfo } from "@/lib/api/errors";

interface ApiErrorStateProps {
  error: ApiErrorInfo;
  onRetry?: () => void;
  className?: string;
}

/** ErrorState with the right title, message and button for the kind of failure. */
export function ApiErrorState({ error, onRetry, className }: ApiErrorStateProps) {
  const router = useRouter();
  const needsSignIn = error.kind === "unauthenticated";

  return (
    <ErrorState
      title={error.title}
      description={error.message}
      className={className}
      // Retrying a 401 can't succeed, so offer sign-in instead.
      onRetry={needsSignIn ? undefined : onRetry}
      action={
        needsSignIn ? (
          <Button size="sm" className="mt-2" onClick={() => router.push("/sign-in")}>
            Sign in again
          </Button>
        ) : undefined
      }
    />
  );
}
