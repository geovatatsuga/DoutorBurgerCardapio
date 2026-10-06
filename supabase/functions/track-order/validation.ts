export function phoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("55") && (digits.length === 12 || digits.length === 13) ? digits.slice(2) : digits;
}

export function parseTrackingInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const payload = input as Record<string, unknown>;
  if (typeof payload.order_number !== "number" || typeof payload.phone !== "string") return null;
  const orderNumber = payload.order_number;
  const phone = phoneDigits(payload.phone);
  if (!Number.isSafeInteger(orderNumber) || orderNumber < 1 || !/^\d{10,11}$/.test(phone)) return null;
  return { orderNumber, phone };
}
