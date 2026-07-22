import { describe, it, expect } from "vitest";
import {
  moneyFormat,
  centsToMoney,
  moneyToCents,
  calculateItemUnitPrice,
  calculateSubtotal,
  calculateOrderTotal,
} from "./calculations";

describe("BurgerC Calculation Engine", () => {
  it("formats monetary values safely in BRL", () => {
    expect(moneyFormat(29.9)).toContain("29,90");
    expect(moneyFormat(0)).toContain("0,00");
    expect(moneyFormat(-15)).toContain("0,00");
    expect(moneyFormat(NaN)).toContain("0,00");
    expect(moneyFormat(null as any)).toContain("0,00");
  });

  it("converts cents to money correctly without precision issues", () => {
    expect(centsToMoney(2990)).toBe(29.9);
    expect(centsToMoney(0)).toBe(0);
    expect(centsToMoney(-500)).toBe(0);
    expect(centsToMoney(null)).toBe(0);
    expect(centsToMoney(undefined)).toBe(0);
  });

  it("converts money to cents accurately avoiding floating point errors", () => {
    expect(moneyToCents(29.9)).toBe(2990);
    expect(moneyToCents(19.99)).toBe(1999);
    expect(moneyToCents(0)).toBe(0);
    expect(moneyToCents(-10)).toBe(0);
  });

  it("calculates item unit price with base price, extras, and combo fees", () => {
    const base = 25;
    const extras = [{ name: "Bacon Extra", price: 4 }, { name: "Cheddar Extra", price: 3 }];
    expect(calculateItemUnitPrice(base, extras, false)).toBe(32);
    expect(calculateItemUnitPrice(base, extras, true)).toBe(40); // 32 + 8 combo
    expect(calculateItemUnitPrice(base, [], false)).toBe(25);
  });

  it("calculates subtotal for multiple cart items", () => {
    const cart = [
      { id: "1", name: "Doutor Burger", price: 32.9, qty: 2, extras: [{ name: "Bacon", price: 4 }] }, // (32.9+4)*2 = 73.8
      { id: "2", name: "Guaraná 350ml", price: 6, qty: 3 }, // 6*3 = 18
    ];
    expect(calculateSubtotal(cart)).toBeCloseTo(91.8, 2);
  });

  it("calculates order total and validates minimum order requirement", () => {
    // Delivery mode with fee
    const deliveryResult = calculateOrderTotal(50, "Entrega", 7, 30);
    expect(deliveryResult.total).toBe(57);
    expect(deliveryResult.meetsMinOrder).toBe(true);

    // Below minimum order
    const belowMinResult = calculateOrderTotal(20, "Entrega", 7, 30);
    expect(belowMinResult.total).toBe(27);
    expect(belowMinResult.meetsMinOrder).toBe(false);

    // Pickup mode (no delivery fee)
    const pickupResult = calculateOrderTotal(20, "Retirada", 7, 30);
    expect(pickupResult.total).toBe(20);
    expect(pickupResult.meetsMinOrder).toBe(true);
  });

  it("handles negative and null values gracefully in order total calculation", () => {
    const invalidResult = calculateOrderTotal(-50, "Entrega", -5, -10);
    expect(invalidResult.total).toBe(0);
    expect(invalidResult.meetsMinOrder).toBe(true);
  });
});
