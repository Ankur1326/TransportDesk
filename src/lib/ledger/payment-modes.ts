/**
 * Payment modes. Lives apart from models/Payment.ts so browser code (the
 * record-payment dialog) can import it without pulling mongoose into the bundle.
 */
export const PAYMENT_MODES = ["Cash", "NEFT", "Cheque", "UPI", "Other"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];
