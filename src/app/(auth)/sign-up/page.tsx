"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { AuthAlert, AuthShell } from "@/components/auth/AuthShell";
import { GOOGLE_AUTH_ENABLED, GoogleButton, OrDivider } from "@/components/auth/GoogleButton";
import { PasswordField } from "@/components/auth/PasswordField";
import { TextField } from "@/components/auth/TextField";
import { Button } from "@/components/Button";
import { Check } from "@/components/icons";
import { PASSWORD_RULES, isStrongPassword, isValidEmail, normalizeEmail } from "@/lib/auth-config";
import { cn } from "@/lib/utils";

type Errors = Partial<Record<"fullName" | "email" | "password" | "confirmPassword", string>>;

export default function Page() {
    const router = useRouter();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState<Errors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const rules = useMemo(() => PASSWORD_RULES.map((rule) => ({ ...rule, ok: rule.test(password) })), [password]);

    function validate(): Errors {
        const next: Errors = {};
        if (!fullName.trim()) next.fullName = "Enter your name";
        if (!isValidEmail(normalizeEmail(email))) next.email = "Enter a valid email address";
        if (!isStrongPassword(password)) next.password = "Password doesn't meet the requirements below";
        if (confirmPassword !== password) next.confirmPassword = "Passwords don't match";
        return next;
    }

    async function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (submitting) return;

        const found = validate();
        setErrors(found);
        setFormError(null);
        if (Object.keys(found).length) return;

        setSubmitting(true);
        try {
            const normalized = normalizeEmail(email);
            const { data } = await axios.post("/api/auth/sign-up", {
                fullName: fullName.trim(),
                email: normalized,
                password,
            });

            // Sign them straight in so there's no second login step.
            const result = await signIn("credentials", { redirect: false, email: normalized, password });
            if (result?.error) {
                router.replace("/sign-in?registered=1");
                return;
            }
            router.replace("/admin/dashboard");
            router.refresh();
        } catch (error) {
            const payload = axios.isAxiosError(error)
                ? (error.response?.data as { message?: string; field?: string } | undefined)
                : undefined;
            const message = payload?.message || "Something went wrong. Please try again.";
            if (payload?.field === "email" || payload?.field === "password") {
                setErrors({ [payload.field]: message });
            } else {
                setFormError(message);
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AuthShell
            title="Create your account"
            subtitle="Set up your workspace in under a minute."
            footer={
                <>
                    Already have an account?{" "}
                    <Link href="/sign-in" className="focus-ring rounded font-semibold text-brand-700 hover:underline">
                        Sign in
                    </Link>
                </>
            }
        >
            {formError && (
                <div className="mb-4">
                    <AuthAlert>{formError}</AuthAlert>
                </div>
            )}

            {GOOGLE_AUTH_ENABLED && (
                <div>
                    <GoogleButton callbackUrl="/admin/dashboard" label="Sign up with Google" />
                    <OrDivider />
                </div>
            )}

            <form onSubmit={onSubmit} noValidate className="space-y-4">
                <TextField
                    label="Full name"
                    name="name"
                    autoComplete="name"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    error={errors.fullName}
                    autoFocus
                />
                <TextField
                    label="Work email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={errors.email}
                />

                <div>
                    <PasswordField
                        label="Password"
                        name="new-password"
                        autoComplete="new-password"
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        error={errors.password}
                    />
                    <ul className="mt-2.5 space-y-1" aria-label="Password requirements">
                        {rules.map((rule) => (
                            <li
                                key={rule.id}
                                className={cn("flex items-center gap-2 text-body-sm", rule.ok ? "text-success-700" : "text-neutral-500")}
                            >
                                <span
                                    className={cn(
                                        "flex h-4 w-4 items-center justify-center rounded-full border",
                                        rule.ok ? "border-success-500 bg-success-500 text-white" : "border-neutral-300"
                                    )}
                                    aria-hidden="true"
                                >
                                    {rule.ok && <Check className="h-3 w-3" />}
                                </span>
                                {rule.label}
                            </li>
                        ))}
                    </ul>
                </div>

                <PasswordField
                    label="Confirm password"
                    name="confirm-password"
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={errors.confirmPassword}
                />

                <Button type="submit" size="lg" isLoading={submitting} className="w-full">
                    {submitting ? "Creating account…" : "Create account"}
                </Button>
            </form>
        </AuthShell>
    );
}
