"use client";

import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { UserRound } from "@/components/icons";
import { useState } from "react";
import { AppDispatch, RootState } from "@/redux/store";
import { fetchUserProfile } from "@/redux/slices/userSlice";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function displayValue(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).trim();
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 dark:border-brand-800 dark:bg-brand-900">
      <dt className="text-caption font-medium text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className="mt-1 break-words text-body-sm font-medium text-brand-900 dark:text-white">
        {value || "Not provided"}
      </dd>
    </div>
  );
}

function ProfileAvatar({ src, name }: { src: string; name: string }) {
  const [hasImageError, setHasImageError] = useState(false);

  if (!src || hasImageError) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700 dark:bg-brand-800 dark:text-accent-300">
        <UserRound className="h-8 w-8" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-neutral-100 dark:bg-brand-800">
      <Image
        src={src}
        alt={`${name} profile photo`}
        fill
        sizes="64px"
        className="object-cover"
        onError={() => setHasImageError(true)}
      />
    </div>
  );
}

export default function ProfilePage() {
  const { data: session, status: sessionStatus } = useSession();
  const dispatch = useDispatch<AppDispatch>();
  const { profile, profilePicture, status } = useSelector((state: RootState) => state.user);
  const user = isRecord(profile?.user) ? profile.user : null;

  if (sessionStatus === "loading" || (session && status === "loading" && !user)) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6 text-body-sm text-neutral-500 dark:border-brand-800 dark:bg-brand-900 dark:text-neutral-300">
        Loading profile…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6 text-body-sm text-neutral-700 dark:border-brand-800 dark:bg-brand-900 dark:text-neutral-200">
        Your profile is available after you sign in.{" "}
        <Link className="font-semibold text-accent-700 underline dark:text-accent-400" href="/sign-in">
          Sign in
        </Link>
      </div>
    );
  }

  const fullName =
    displayValue(user?.fullName) ||
    displayValue(user?.username) ||
    displayValue(session.user?.name) ||
    "My Profile";
  const email = displayValue(user?.email) || displayValue(session.user?.email);
  const picture = displayValue(user?.profilePicture) || displayValue(profilePicture);
  const dateOfBirth = displayValue(user?.dateOfBirth);
  const errorMessage =
    isRecord(profile) && typeof profile.message === "string"
      ? profile.message
      : "Unable to load your profile.";

  return (
    <main className="mx-auto max-w-4xl space-y-5">
      <header className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-brand-800 dark:bg-brand-900">
        <ProfileAvatar src={picture} name={fullName} />
        <div className="min-w-0">
          <h1 className="text-h3 font-semibold text-brand-900 dark:text-white">My Profile</h1>
          <p className="mt-1 truncate text-body-sm text-neutral-500 dark:text-neutral-400">
            {fullName}{email ? ` · ${email}` : ""}
          </p>
        </div>
      </header>

      {status === "failed" && !user ? (
        <section
          role="alert"
          className="rounded-xl border border-error-200 bg-error-50 p-5 text-body-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
        >
          <p>{errorMessage}</p>
          {email && (
            <button
              type="button"
              onClick={() => dispatch(fetchUserProfile({ email }))}
              className="mt-3 rounded-lg border border-error-300 px-3 py-2 font-semibold hover:bg-error-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-500/50 dark:border-error-500/40 dark:hover:bg-error-500/20"
            >
              Try again
            </button>
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-brand-800 dark:bg-brand-900">
          <h2 className="text-body-sm font-semibold text-brand-900 dark:text-white">Profile details</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <ProfileField label="Full name" value={fullName} />
            <ProfileField label="Email" value={email} />
            <ProfileField label="Mobile number" value={displayValue(user?.mobileNum)} />
            <ProfileField label="Gender" value={displayValue(user?.gender)} />
            <ProfileField label="Date of birth" value={dateOfBirth ? dateOfBirth.slice(0, 10) : ""} />
            <ProfileField label="Address" value={displayValue(user?.address)} />
          </dl>
        </section>
      )}
    </main>
  );
}
