import { describe, expect, it } from "vitest";
import { findDeliveryZone, formatDeliveryAddress, onlyCepDigits } from "../supabase/functions/_shared/delivery-zone";

const zones = [
  { id: "jp", name: "Centro", is_active: true },
  { id: "bayeux", name: "Bayeux - Centro", is_active: true },
  { id: "mateus", name: "Alto do Mateus", is_active: true },
  { id: "inactive", name: "Torre", is_active: false },
];

describe("delivery zone lookup", () => {
  it("distinguishes cities with the same neighborhood", () => {
    expect(findDeliveryZone({ uf: "PB", localidade: "João Pessoa", bairro: "Centro" }, zones)?.id).toBe("jp");
    expect(findDeliveryZone({ uf: "PB", localidade: "Bayeux", bairro: "Centro" }, zones)?.id).toBe("bayeux");
  });

  it("matches accents but not an inactive or unknown area", () => {
    expect(findDeliveryZone({ uf: "PB", localidade: "Joao Pessoa", bairro: "Alto do Mateus" }, zones)?.id).toBe("mateus");
    expect(findDeliveryZone({ uf: "PB", localidade: "João Pessoa", bairro: "Torre" }, zones)).toBeNull();
    expect(findDeliveryZone({ uf: "PB", localidade: "João Pessoa", bairro: "" }, zones)).toBeNull();
    expect(findDeliveryZone({ uf: "PE", localidade: "Bayeux", bairro: "Centro" }, zones)).toBeNull();
  });

  it("accepts only an eight-digit postal code", () => {
    expect(onlyCepDigits("58090-240")).toBe("58090240");
    expect(onlyCepDigits("58A90-240")).toBe("5890240");
  });

  it("keeps the number visible to kitchen and delivery staff", () => {
    expect(formatDeliveryAddress({ street: "Rua Clotilde Torres", number: "116-B", neighborhood: "Alto do Mateus", city: "João Pessoa", uf: "PB", cep: "58090240" }))
      .toContain("Rua Clotilde Torres, 116-B - Alto do Mateus");
    expect(formatDeliveryAddress({ street: "Rua antiga" })).toBe("Rua antiga");
  });
});
