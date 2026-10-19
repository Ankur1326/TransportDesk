/**
 * Central auth settings + validation shared by the sign-up API, the sign-up
 * form and NextAuth. Keep client-safe: no server-only imports here.
 */

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_RULES = [
  { id: "length", label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (v: string) => v.length >= PASSWORD_MIN_LENGTH },
  { id: "case", label: "Upper and lower case letters", test: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { id: "number", label: "At least one number", test: (v: string) => /\d/.test(v) },
] as const;

export function isStrongPassword(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_RE.test(value);
}

/**
 * Only allow same-site relative redirects after sign-in. Blocks open
 * redirects such as `?callbackUrl=https://evil.com` or `//evil.com`.
 */
export function safeCallbackUrl(value: string | null | undefined, fallback = "/admin/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/sign-in") || value.startsWith("/sign-up") || value.startsWith("/api/")) return fallback;
  return value;
}

/** Maps NextAuth / our own error codes to user-facing copy. */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccountNotApproved: "Your account is waiting for approval. We'll let you know once it's active.",
  InvalidCredentials: "Incorrect email or password.",
  CredentialsSignin: "Incorrect email or password.",
  AccessDenied: "Access denied. Please use a different account.",
  OAuthAccountNotLinked: "This email is already registered with a password. Sign in with your email and password instead.",
  OAuthCallback: "Google sign-in failed. Please try again.",
  OAuthSignin: "Google sign-in failed. Please try again.",
  Callback: "Sign-in failed. Please try again.",
  SessionRequired: "Please sign in to continue.",
  Default: "Something went wrong. Please try again.",
};

export function authErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return AUTH_ERROR_MESSAGES[code] ?? AUTH_ERROR_MESSAGES.Default;
}
