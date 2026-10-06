import { describe, expect, it } from "vitest";
import { buildPixPayload, normalizePixKey } from "./pix";

describe("Pix manual", () => {
  it("requires an explicitly configured key in a supported format", () => {
    expect(normalizePixKey("(83) 98765-4321")).toBeNull();
    expect(normalizePixKey("+5583987654321")).toBe("+5583987654321");
    expect(normalizePixKey("123")).toBeNull();
    expect(buildPixPayload({ key: "", merchantName: "Doutor Burger", merchantCity: "Joao Pessoa", amountCents: 1800 })).toBeNull();
  });

  it("creates a value-specific BR Code from an explicitly configured key", () => {
    const payload = buildPixPayload({ key: "loja@example.com", merchantName: "Doutor Burger", merchantCity: "Joao Pessoa", amountCents: 1800 });
    expect(payload).toContain("0014BR.GOV.BCB.PIX");
    expect(payload).toContain("540518.00");
    expect(payload).toMatch(/6304[A-F0-9]{4}$/);
  });

  it("encodes cents exactly and rejects non-integer values", () => {
    expect(buildPixPayload({ key: "loja@example.com", amountCents: 101 })).toContain("54041.01");
    expect(buildPixPayload({ key: "loja@example.com", amountCents: 100.5 })).toBeNull();
    expect(buildPixPayload({ key: "loja@example.com", amountCents: 0 })).toBeNull();
  });
});
