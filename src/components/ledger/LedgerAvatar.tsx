import { cn } from "@/lib/utils";
import { PARTY_CONFIG, type PartyKind } from "@/lib/ledger/party-kind";

/** Same name -> same colour, so a customer is recognisable at a glance. Colours come from tokens. */
const hash = (s: string): number => {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
};

const TONES = [
  "bg-(--avatar-1-bg) text-(--avatar-1-fg)",
  "bg-(--avatar-2-bg) text-(--avatar-2-fg)",
  "bg-(--avatar-3-bg) text-(--avatar-3-fg)",
  "bg-(--avatar-4-bg) text-(--avatar-4-fg)",
  "bg-(--avatar-5-bg) text-(--avatar-5-fg)",
  "bg-(--avatar-6-bg) text-(--avatar-6-fg)",
] as const;

export function LedgerAvatar({ name, className }: { name: string; className?: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        TONES[hash(name.trim().toLowerCase()) % TONES.length],
        className ?? "h-10 w-10 text-sm"
      )}
    >
      {initial}
    </span>
  );
}

/** Dr / Cr / Settled pill. Text plus colour, never colour alone. */
export function BalancePill({ net, kind = "customer", className }: { net: number; kind?: PartyKind; className?: string }) {
  const cfg = PARTY_CONFIG[kind];
  const tone =
    net > 0
      ? cfg.increase.softText
      : net < 0
        ? cfg.decrease.softText
        : "bg-neutral-100 text-neutral-500 dark:bg-white/10 dark:text-neutral-300";
  return (
    <span className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none", tone, className)}>
      {net > 0 ? cfg.net.positiveCode : net < 0 ? cfg.net.negativeCode : "Nil"}
    </span>
  );
}
