"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "@/components/icons";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/Button";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";

export default function Page() {
    const [identifier, setIdentifier] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isSubmitting, setSubmitting] = useState(false);
    const router = useRouter()

    useEffect(() => {
        const error = new URLSearchParams(window.location.search).get("error");
        if (error === "AccountNotApproved") {
            toast.error("Your account requires admin approval before you can sign in.");
        }
    }, []);

    const onSubmit = async (e: any) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const credentials: any = {
                redirect: false,
                email: identifier.trim(),
                password: password,
            };

            const result = await signIn('credentials', credentials);

            if (result?.error) {
                toast.error(
                    result.error === "AccountNotApproved"
                        ? "Your account requires admin approval before you can sign in."
                        : result.error
                );
            }

            if (result?.ok) {
                const response = await fetch('/api/auth/session');
                const session = await response.json();
                if (session?.user?.role === "transporter") {
                    router.replace("/admin/dashboard");
                } else {
                    toast.error("Your account does not have access to a dashboard.");
                }
            }
        } catch (error) {
            console.error("Error during sign-in:", error);
            toast.error("An unexpected error occurred. Please try again later.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50">
            <header className="border-b border-neutral-200 bg-white">
                <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <Link href="/" className="focus-ring flex items-center gap-2 rounded-md font-semibold text-brand-800">
                        <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg">
                            <Image src="/media/UTS-logo.png" alt="Umashakti Transport Service" width={40} height={40} priority />
                        </span>
                        <span className="text-lg font-semibold text-brand-800 sm:text-xl">UmaShakti Transport</span>
                    </Link>

                    <Link href="/" className="focus-ring hidden rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:text-brand-700 sm:inline-flex">
                        Back to Home
                    </Link>
                </div>
            </header>

            <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
                <div className="mx-auto max-w-5xl flex items-center justify-center">
                    <section className="bg-white rounded-xl shadow p-8 md:p-10">
                        <div className="mb-6">
                            <h1 className="text-2xl font-semibold">Sign in to your account</h1>
                            <p className="mt-1 text-sm text-neutral-600">Use your transporter account credentials to continue.</p>
                        </div>

                        <form onSubmit={onSubmit} className="space-y-4">
                            <Input
                                label="Email" type="email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required placeholder="you@company.com" />

                            <div>
                                <label className="mb-1.5 block text-body-sm font-medium text-neutral-800">Password</label>
                                <div className="relative">
                                    <input
                                        aria-label="Password"
                                        className="focus-ring h-11 w-full rounded-lg border border-neutral-300 bg-white px-3.5 pr-11 text-body text-neutral-900 placeholder:text-neutral-400"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((s) => !s)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm text-neutral-700">
                                    <input type="checkbox" className="h-4 w-4 rounded border-neutral-300" />
                                    <span>Remember me</span>
                                </label>
                                <Link href="#" className="text-sm text-brand-700 hover:underline">Forgot password?</Link>
                            </div>

                            <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} className="w-full">
                                {isSubmitting ? (
                                    "Signing in..."
                                ) : (
                                    "Sign in"
                                )}
                            </Button>

                            <div className="mt-2 text-center">
                                <p className="text-sm text-neutral-600">Don't have an account? <Link href="/sign-up" className="text-brand-700 hover:underline">Request access</Link></p>
                            </div>
                        </form>

                        <div className="mt-6 text-xs text-neutral-400 text-center">© {new Date().getFullYear()} UmaShakti Transport</div>
                    </section>
                </div>
            </main>
        </div>
    );
}