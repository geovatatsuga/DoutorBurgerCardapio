import { describe, expect, it } from "vitest";
import { parseAuthoritativeOrderTotals } from "./orderTotals";

describe("authoritative order totals", () => {
  it("uses integer cent values returned by the server", () => {
    expect(parseAuthoritativeOrderTotals({ order_id: "order", subtotal_cents: 1800, delivery_fee_cents: 690, total_cents: 2490 }))
      .toEqual({ subtotal: 18, deliveryFee: 6.9, total: 24.9, totalCents: 2490 });
  });

  it("rejects missing, fractional, or inconsistent totals", () => {
    expect(parseAuthoritativeOrderTotals({ order_id: "order", total_cents: 2490 })).toBeNull();
    expect(parseAuthoritativeOrderTotals({ order_id: "order", subtotal_cents: 1800, delivery_fee_cents: 690, total_cents: 2500 })).toBeNull();
    expect(parseAuthoritativeOrderTotals({ order_id: "order", subtotal_cents: 1800.5, delivery_fee_cents: 690, total_cents: 2490.5 })).toBeNull();
  });
});
