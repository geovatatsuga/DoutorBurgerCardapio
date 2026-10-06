import { describe, expect, it } from "vitest";
import { getRemovableIngredients } from "./removableIngredients";

describe("getRemovableIngredients", () => {
  it("offers real X-Salada toppings and sauces, never bread or meat", () => {
    expect(getRemovableIngredients({
      name: "X-Salada",
      ingredients: ["Pao brioche", "Blend 90 g", "Queijo prato", "Salada fresca"],
    })).toEqual(["Queijo prato", "Alface", "Tomate", "Cebola roxa", "Maionese de ervas"]);
  });

  it("uses each selected burger's specific removals", () => {
    expect(getRemovableIngredients({ name: "X-Bacon" })).toContain("Maionese de alho");
    expect(getRemovableIngredients({ name: "Cheeseburger" })).toContain("Maionese da casa");
  });

  it("respects custom ingredients from the admin panel", () => {
    expect(getRemovableIngredients({
      name: "X-Salada",
      ingredients: ["Pão australiano", "Blend bovino 90g", "Queijo cheddar", "Molho barbecue"],
    })).toEqual(["Queijo cheddar", "Molho barbecue"]);
  });

  it("returns no choices for an unknown product without ingredients", () => {
    expect(getRemovableIngredients({ name: "Novo burger" })).toEqual([]);
  });
});
