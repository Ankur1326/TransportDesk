export function notCancelledMatch() {
  return { status: { $ne: "Cancelled" } };
}
