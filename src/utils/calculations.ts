/**
 * Utility calculations for BurgerC platform (monetary, totals, fees, modifiers)
 */

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  extras?: Array<{ name: string; price: number }>;
  combo?: boolean;
}

export function moneyFormat(amount: number): string {
  const safeAmount = isNaN(amount) || amount === null || amount === undefined ? 0 : amount;
  const positiveAmount = Math.max(0, safeAmount);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(positiveAmount);
}

export function centsToMoney(cents: number | null | undefined): number {
  if (cents === null || cents === undefined || isNaN(cents)) return 0;
  return Math.max(0, Math.round(cents)) / 100;
}

export function moneyToCents(amount: number | null | undefined): number {
  if (amount === null || amount === undefined || isNaN(amount)) return 0;
  return Math.max(0, Math.round(amount * 100));
}

export function calculateItemUnitPrice(
  basePrice: number,
  extras: Array<{ price: number }> = [],
  combo: boolean = false,
  comboFee: number = 8
): number {
  const safeBase = Math.max(0, isNaN(basePrice) ? 0 : basePrice);
  const extrasTotal = (extras || []).reduce((sum, extra) => sum + Math.max(0, isNaN(extra.price) ? 0 : extra.price), 0);
  const comboExtra = combo ? Math.max(0, comboFee) : 0;
  return safeBase + extrasTotal + comboExtra;
}

export function calculateSubtotal(items: CartItem[]): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    const itemQty = Math.max(0, isNaN(item.qty) ? 0 : item.qty);
    const unitPrice = calculateItemUnitPrice(item.price, item.extras, item.combo);
    return sum + unitPrice * itemQty;
  }, 0);
}

export function calculateOrderTotal(
  subtotal: number,
  receiveMode: "Entrega" | "Retirada",
  deliveryFee: number = 0,
  minOrder: number = 0
): { total: number; meetsMinOrder: boolean } {
  const safeSubtotal = Math.max(0, isNaN(subtotal) ? 0 : subtotal);
  const safeFee = receiveMode === "Entrega" ? Math.max(0, isNaN(deliveryFee) ? 0 : deliveryFee) : 0;
  const meetsMinOrder = receiveMode !== "Entrega" || safeSubtotal >= Math.max(0, minOrder);

  return {
    total: safeSubtotal + safeFee,
    meetsMinOrder,
  };
}
