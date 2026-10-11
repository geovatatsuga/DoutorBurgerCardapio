import { describe, expect, it } from "vitest";
import { BUSINESS_INFO, storeWhatsappUrl } from "./businessInfo";

describe("commercial contact", () => {
  it("uses the confirmed WhatsApp number in public links", () => {
    expect(storeWhatsappUrl()).toBe("https://wa.me/5583999662590");
    expect(storeWhatsappUrl(BUSINESS_INFO.whatsapp, "Pedido #42"))
      .toBe("https://wa.me/5583999662590?text=Pedido%20%2342");
  });

  it("does not prepend the country code twice", () => {
    expect(storeWhatsappUrl("+55 (83) 99966-2590"))
      .toBe("https://wa.me/5583999662590");
  });
});
