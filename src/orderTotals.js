export function parseAuthoritativeOrderTotals(response) {
  if (!response || typeof response.order_id !== "string") return null;
  const fields = ["subtotal_cents", "delivery_fee_cents", "total_cents"];
  if (!fields.every((field) => Number.isSafeInteger(response[field]) && response[field] >= 0)) return null;
  if (response.subtotal_cents + response.delivery_fee_cents !== response.total_cents) return null;
  return {
    subtotal: response.subtotal_cents / 100,
    deliveryFee: response.delivery_fee_cents / 100,
    total: response.total_cents / 100,
    totalCents: response.total_cents,
  };
}
