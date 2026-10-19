import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      _id: string;
      role: "transporter";
      isVerified: boolean;
      isApproved: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    _id?: string;
    role?: "transporter";
    isVerified?: boolean;
    isApproved?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    _id?: string;
    role?: "transporter";
    isVerified?: boolean;
    isApproved?: boolean;
  }
}
