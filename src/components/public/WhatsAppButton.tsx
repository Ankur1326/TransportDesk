import { MessageCircle } from "@/components/icons";
import { buildWhatsAppLink } from "@/lib/site-config";
import { cn } from "@/lib/utils";

interface WhatsAppButtonProps {
  message?: string;
  className?: string;
}

/**
 * Standalone floating WhatsApp button. Usually rendered inside
 * FloatingActions (stacked with CallButton), but exported separately in
 * case a page wants just the WhatsApp action on its own.
 */
export function WhatsAppButton({ message, className }: WhatsAppButtonProps) {
  return (
    <a
      href={buildWhatsAppLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={cn(
        "focus-ring flex h-14 w-14 items-center justify-center rounded-full bg-success-500 text-white shadow-lg transition-transform hover:scale-105 hover:bg-success-600",
        className
      )}
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
    </a>
  );
}