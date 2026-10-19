"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { AuthAlert, AuthShell } from "@/components/auth/AuthShell";
import { GOOGLE_AUTH_ENABLED, GoogleButton, OrDivider } from "@/components/auth/GoogleButton";
import { PasswordField } from "@/components/auth/PasswordField";
import { TextField } from "@/components/auth/TextField";
import { Button } from "@/components/Button";
import { authErrorMessage, isValidEmail, normalizeEmail, safeCallbackUrl } from "@/lib/auth-config";

function SignInForm() {
    const router = useRouter();
    const params = useSearchParams();
    const callbackUrl = safeCallbackUrl(params.get("callbackUrl"));

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
    // Seed from the URL so redirects like ?error=AccountNotApproved show a message.
    const [formError, setFormError] = useState<string | null>(authErrorMessage(params.get("error")));
    const [submitting, setSubmitting] = useState(false);

    const justRegistered = params.get("registered") === "1";

    async function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (submitting) return;

        const normalized = normalizeEmail(email);
        const errors: typeof fieldErrors = {};
        if (!isValidEmail(normalized)) errors.email = "Enter a valid email address";
        if (!password) errors.password = "Enter your password";
        setFieldErrors(errors);
        setFormError(null);
        if (Object.keys(errors).length) return;

        setSubmitting(true);
        try {
            const result = await signIn("credentials", { redirect: false, email: normalized, password });

            if (result?.error) {
                setFormError(authErrorMessage(result.error));
                return;
            }

            // Hard navigation guarantees the new session cookie is picked up by the proxy and server components.
            router.replace(callbackUrl);
            router.refresh();
        } catch (error) {
            console.error("Sign-in failed:", error);
            setFormError("We couldn't reach the server. Check your connection and try again.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AuthShell
            title="Welcome back"
            subtitle="Sign in to manage your LRs, bills and bookings."
            footer={
                <>
                    New here?{" "}
                    <Link href="/sign-up" className="focus-ring rounded font-semibold text-brand-700 hover:underline">
                        Create an account
                    </Link>
                </>
            }
        >
            <div className="space-y-4">
                {justRegistered && <AuthAlert tone="success">Account created. Sign in to get started.</AuthAlert>}
                {formError && <AuthAlert>{formError}</AuthAlert>}
            </div>

            {GOOGLE_AUTH_ENABLED && (
                <div className="mt-4">
                    <GoogleButton callbackUrl={callbackUrl} />
                    <OrDivider />
                </div>
            )}

            <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
                <TextField
                    label="Email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={fieldErrors.email}
                    autoFocus
                />
                <PasswordField
                    label="Password"
                    name="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={fieldErrors.password}
                />

                <Button type="submit" size="lg" isLoading={submitting} className="w-full">
                    {submitting ? "Signing in…" : "Sign in"}
                </Button>
            </form>
        </AuthShell>
    );
}

export default function Page() {
    // useSearchParams needs a Suspense boundary for static rendering.
    return (
        <Suspense fallback={null}>
            <SignInForm />
        </Suspense>
    );
}
