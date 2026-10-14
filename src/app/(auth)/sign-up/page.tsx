'use client'

import axios from "axios"
import { Eye, EyeOff, Loader2 } from "@/components/icons"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
// import ReCAPTCHA from "react-google-recaptcha"
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function Page() {
    const [email, setEmail] = useState<string>('')
    const [password, setPassword] = useState<string>('')
    const [confirmPassword, setConfirmPassword] = useState<string>('')

    const [showPassword, setShowPassword] = useState<boolean>(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false)

    const [isSubmitting, setSubmitting] = useState<boolean>(false)
    const router = useRouter()

    const onSubmit = async (e: any) => {
        e.preventDefault()
        setSubmitting(true)
        if (!email || !password) {
            // toast.error("All fields required")
            setSubmitting(false)
            return
        }

        if (!passwordRegex.test(password)) {
            // toast.error("Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.")
            setSubmitting(false)
            return
        }

        if (password !== confirmPassword) {
            // toast.error("Passwords do not match")
            setSubmitting(false)
            return
        }
        try {
            const response = await axios.post("/api/auth/sign-up", {
                email,
                password,
            });

            if (response.data.success) {
                // toast.success(response.data.message)
                router.push("/sign-in");
            }
        } catch (error: any) {
            const errorMessage = error.response?.data.message || "Something went wrong"

            // Check if it's a verification code already active error
            if (errorMessage.includes("verification code is already active") ||

                errorMessage.includes("already pending") ||
                errorMessage.includes("wait until it expires")) {
                // router.replace(`/verify/${username}`)
                // toast.error("A verification code is already pending for this account")
            } else {
                // toast.error(errorMessage)
            }

            console.error("Error in sign up of user", error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen w-full bg-[#f8faf9]">
            <div className="w-full max-w-md">
                {/* <div className="text-center mb-8">
                        <Image
                            src="/media/logo/beats-engineer.jpg"
                            alt="Mastery Hub"
                            width={160}
                            height={48}
                            className="mx-auto mb-6"
                            priority
                        />
                    </div> */}

                <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h2>
                    <p className="text-gray-600 text-sm">
                        Already have an account? <Link href="/sign-in" className="text-brand-500 hover:text-brand-700 font-semibold hover:underline transition-colors">Sign in</Link>
                    </p>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-600 text-sm mb-2">Email</label>
                        <input
                            type="email"
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="focus-ring h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 pr-11 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-brand-600"
                            placeholder="Enter Email"
                            value={email}
                        />
                    </div>

                    <div className="relative">
                        <label className="block text-gray-600 text-sm mb-2">Password</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            onChange={(e) => setPassword(e.target.value)}
                            value={password}
                            required
                            className="focus-ring h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 pr-11 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-brand-600"
                            placeholder="Enter Password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                            aria-label="Toggle password visibility"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <div className="relative">
                        <label className="block text-gray-600 text-sm mb-2">Confirm Password</label>
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            value={confirmPassword}
                            required
                            className="focus-ring h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 pr-11 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-brand-600"
                            placeholder="Confirm Password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                            aria-label="Toggle password visibility"
                        >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {password !== confirmPassword && password && confirmPassword && (
                        <p className="text-sm text-red-500 -mt-2">Passwords do not match</p>
                    )}

                    {/* <div className="flex justify-center mt-5">
                            <ReCAPTCHA
                                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                                onChange={setCaptchaToken}
                            />
                        </div> */}

                    <button
                        type="submit"
                        className="focus-ring flex h-11 w-full items-center justify-center rounded-lg bg-brand-700 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? (
                            <div className="flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin" size={20} />
                                <span>Please wait...</span>
                            </div>
                        ) : (
                            "Create Account"
                        )}
                    </button>

                    <div className="flex items-center my-6">
                        <div className="flex-grow border-t border-gray-200"></div>
                        {/* <span className="px-4 text-gray-500 text-sm">or</span> */}
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>
                </form>

                <div className="mt-5 text-center text-xs text-gray-500">
                    By signing up, you agree to our <a href="#" className="text-[#66B788] hover:text-[#4a8f65] hover:underline">Terms of Service</a> and <a href="#" className="text-[#66B788] hover:text-[#4a8f65] hover:underline">Privacy Policy</a>
                </div>
            </div>
        </div>
    )
}