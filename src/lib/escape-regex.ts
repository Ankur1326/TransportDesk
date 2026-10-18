/** Escape user input before building a RegExp (prevents ReDoS / invalid-pattern 500s). */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
