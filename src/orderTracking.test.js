import { describe, expect, it } from "vitest";
import { parseTrackingInput, phoneDigits } from "../supabase/functions/track-order/validation.ts";

describe("guest order tracking credentials", () => {
  it("requires a safe order number and a complete Brazilian phone", () => {
    expect(parseTrackingInput({ order_number: 103, phone: "(83) 98765-4321" }))
      .toEqual({ orderNumber: 103, phone: "83987654321" });
    expect(parseTrackingInput({ order_number: 103, phone: "+55 (83) 98765-4321" })?.phone)
      .toBe("83987654321");
  });

  it("rejects phone-only, partial phone, invalid numbers, and coerced values", () => {
    expect(parseTrackingInput({ phone: "83987654321" })).toBeNull();
    expect(parseTrackingInput({ order_number: 103, phone: "98765-4321" })).toBeNull();
    expect(parseTrackingInput({ order_number: "103", phone: "83987654321" })).toBeNull();
    expect(parseTrackingInput({ order_number: Number.MAX_SAFE_INTEGER + 1, phone: "83987654321" })).toBeNull();
    expect(parseTrackingInput([])).toBeNull();
    expect(phoneDigits("55987654321")).toBe("55987654321");
  });
});
