import { describe, expect, it } from "vitest";
import { resolveCatalogImage } from "./catalogImages";

describe("resolveCatalogImage", () => {
  it.each([
    ["X-Salada", "/assets/products/x-salada-burgerc.webp", "/assets/products/x-salada-wide.webp"],
    ["Cheeseburger", "/assets/products/cheeseburger-burgerc.webp", "/assets/products/cheeseburger-wide.webp"],
    ["X-Bacon", "/assets/products/x-bacon-burgerc.webp", "/assets/products/x-bacon-wide.webp"],
    ["Agridoce", "/assets/products/agridoce-burgerc.webp", "/assets/products/agridoce-wide.webp"],
    ["Duplo", "/assets/products/duplo-burgerc.webp", "/assets/products/duplo-wide.webp"],
    ["Combo Clássico", "/assets/products/combo-doutor-burgerc.webp", "/assets/products/combo-classico-wide.webp"],
    ["Combo Premium", "/assets/products/combo-doutor-burgerc.webp", "/assets/products/combo-premium-wide.webp"],
    ["Combo Fome Grande", "/assets/products/combo-doutor-burgerc.webp", "/assets/products/combo-fome-grande-wide.webp"],
    ["Combo Dupla", "/assets/products/combo-doutor-burgerc.webp", "/assets/products/combo-dupla-wide.webp"],
    ["Combo Degustação", "/assets/products/combo-doutor-burgerc.webp", "/assets/products/combo-degustacao-wide.webp"],
    ["Combo Galera", "/assets/products/combo-doutor-burgerc.webp", "/assets/products/combo-galera-wide.webp"],
  ])("maps %s to its new photo", (name, oldImage, newImage) => {
    expect(resolveCatalogImage(name, oldImage)).toBe(newImage);
  });

  it("keeps a photo uploaded through the admin panel", () => {
    const customImage = "https://example.com/custom-photo.webp";
    expect(resolveCatalogImage("Duplo", customImage)).toBe(customImage);
    expect(resolveCatalogImage("Combo Clássico", customImage)).toBe(customImage);
  });

  it("keeps the image of unrelated products", () => {
    expect(resolveCatalogImage("Coca-Cola", "/assets/products/coca-cola.webp"))
      .toBe("/assets/products/coca-cola.webp");
  });
});
