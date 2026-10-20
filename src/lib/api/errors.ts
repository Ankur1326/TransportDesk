import axios from "axios";

export type ApiErrorKind = "unauthenticated" | "companyProfile" | "companySetup" | "notApproved" | "forbidden" | "notFound" | "rateLimited" | "network" | "server" | "other";

export interface ApiErrorInfo {
  kind: ApiErrorKind;
  /** Short heading, e.g. "Session expired". */
  title: string;
  /** One sentence telling the person what happened and what to do. */
  message: string;
  status?: number;
}

/**
 * Turns any thrown error (usually axios) into something a person can act on,
 * instead of a generic "Something went wrong".
 *
 * `fallback` is the context-specific sentence, e.g. "Couldn't load bills.".
 */
export function getApiErrorInfo(error: unknown, fallback = "Couldn't complete that request."): ApiErrorInfo {
  if (!axios.isAxiosError(error)) {
    return { kind: "other", title: "Couldn't load this", message: fallback };
  }

  const status = error.response?.status;
  const serverMessage = (error.response?.data as { message?: unknown } | undefined)?.message;
  const code = (error.response?.data as { code?: unknown } | undefined)?.code;
  const fromServer = typeof serverMessage === "string" && serverMessage.trim() ? serverMessage.trim() : "";

  if (!error.response) {
    const timedOut = error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
    return {
      kind: "network",
      title: timedOut ? "Request timed out" : "Can't reach the server",
      message: timedOut
        ? "The server took too long to respond. Please try again."
        : "Check your internet connection and try again.",
    };
  }

  if (code === "COMPANY_PROFILE_REQUIRED") {
    return {
      kind: "companyProfile",
      title: "Add your company name first",
      message: fromServer || "Add your company name in Settings before creating anything.",
      status,
    };
  }
  if (code === "COMPANY_SETUP_FAILED") {
    return {
      kind: "companySetup",
      title: "Company account isn't ready",
      message: fromServer || "We couldn't set up your company account. Please try again in a moment.",
      status,
    };
  }
  if (code === "ACCOUNT_NOT_APPROVED") {
    return {
      kind: "notApproved",
      title: "Account awaiting approval",
      message: fromServer || "Your account is waiting for approval.",
      status,
    };
  }

  if (status === 401) {
    return {
      kind: "unauthenticated",
      title: "Session expired",
      message: "Please sign in again to see your company's data.",
      status,
    };
  }
  if (status === 403) {
    return {
      kind: "forbidden",
      title: "Access denied",
      message: fromServer || "Your account doesn't have access to this company's data.",
      status,
    };
  }
  if (status === 404) {
    return { kind: "notFound", title: "Not found", message: fromServer || fallback, status };
  }
  if (status === 429) {
    return {
      kind: "rateLimited",
      title: "Too many requests",
      message: "Please wait a few seconds and try again.",
      status,
    };
  }
  if (status !== undefined && status >= 500) {
    return {
      kind: "server",
      title: "Server problem",
      message: `${fallback} Our server hit a problem — please try again in a moment.`,
      status,
    };
  }

  return { kind: "other", title: "Couldn't load this", message: fromServer || fallback, status };
}
