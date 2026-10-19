import type { NextAuthOptions, User as AuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { normalizeEmail } from "@/lib/auth-config";

/** Compared against when the email is unknown so response time doesn't reveal which emails exist. */
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

interface LeanUser {
    _id: { toString(): string };
    isVerified?: boolean;
    isApproved?: boolean;
    fullName?: string;
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            id: "credentials",
            name: "Email and password",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials): Promise<AuthUser | null> {
                const email = normalizeEmail(credentials?.email);
                const password = credentials?.password;
                if (!email || !password) throw new Error("InvalidCredentials");

                await dbConnect();
                const user = await User.findOne({ email });

                // Same error + similar timing for "no such user" and "wrong password".
                if (!user) {
                    await bcrypt.compare(password, DUMMY_HASH);
                    throw new Error("InvalidCredentials");
                }

                const passwordOk = await user.comparePassword(password);
                if (!passwordOk) throw new Error("InvalidCredentials");

                // Only reveal approval state to someone who proved they own the account.
                if (!user.isApproved) throw new Error("AccountNotApproved");

                return {
                    id: user._id.toString(),
                    _id: user._id.toString(),
                    email: user.email,
                    name: user.fullName || user.email.split("@")[0],
                    role: "transporter",
                    isVerified: user.isVerified,
                    isApproved: user.isApproved,
                };
            },
        }),
        ...(googleEnabled
            ? [
                GoogleProvider({
                    clientId: process.env.GOOGLE_CLIENT_ID as string,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
                    httpOptions: { timeout: 10000 },
                    authorization: { params: { prompt: "select_account" } },
                }),
            ]
            : []),
    ],

    callbacks: {
        /**
         * Google: create the account on first sign-in (single step — no extra
         * callback page needed), then enforce the approval policy.
         */
        async signIn({ user, account, profile }) {
            if (account?.provider !== "google") return true;

            const email = normalizeEmail(user?.email);
            const emailVerified = (profile as { email_verified?: boolean } | undefined)?.email_verified;
            if (!email || emailVerified === false) return false;

            try {
                await dbConnect();
                let dbUser = await User.findOne({ email });

                if (!dbUser) {
                    dbUser = await User.create({
                        email,
                        // Never used to sign in; the model requires a password.
                        password: crypto.randomBytes(24).toString("hex"),
                        fullName: user?.name ?? "",
                        profilePicture: user?.image ?? "",
                        role: "transporter",
                        isVerified: true,
                        isApproved: true,
                    });
                }

                if (!dbUser.isApproved) return "/sign-in?error=AccountNotApproved";
                return true;
            } catch (error) {
                console.error("Google sign-in failed:", error);
                return false;
            }
        },

        async jwt({ token, user }) {
            // `user` is only present on the request that signs the person in.
            if (user?.email) {
                await dbConnect();
                const dbUser = (await User.findOne({ email: normalizeEmail(user.email) })
                    .select("_id isVerified isApproved fullName")
                    .lean()) as LeanUser | null;

                if (dbUser) {
                    token._id = dbUser._id.toString();
                    token.role = "transporter";
                    token.isVerified = !!dbUser.isVerified;
                    token.isApproved = !!dbUser.isApproved;
                    if (dbUser.fullName) token.name = dbUser.fullName;
                }
            }
            return token;
        },

        async session({ session, token }) {
            if (!token?._id) return session;

            session.user._id = token._id;
            session.user.role = "transporter";
            session.user.isVerified = !!token.isVerified;
            session.user.isApproved = !!token.isApproved;

            // Re-check approval so revoking (or deleting) an account takes effect
            // without waiting for the JWT to expire.
            try {
                await dbConnect();
                const current = (await User.findById(token._id).select("isApproved").lean()) as LeanUser | null;
                session.user.isApproved = !!current?.isApproved;
            } catch (error) {
                console.error("Error validating session:", error);
            }

            return session;
        },
    },

    pages: {
        signIn: "/sign-in",
        error: "/sign-in",
    },
    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },
    secret: process.env.NEXTAUTH_SECRET,
};
