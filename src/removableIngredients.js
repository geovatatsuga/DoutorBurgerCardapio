const standardRemovals = {
  "X-Salada": ["Queijo prato", "Alface", "Tomate", "Cebola roxa", "Maionese de ervas"],
  Cheeseburger: ["Queijo cheddar", "Maionese da casa"],
  "X-Bacon": ["Queijo cheddar", "Bacon em tiras", "Cebola chapeada", "Maionese de alho"],
  Agridoce: ["Queijo coalho", "Abacaxi caramelizado", "Maionese de pimenta"],
  Duplo: ["Queijo cheddar", "Bacon em cubos", "Cebola caramelizada no vinho", "Maionese defumada"],
};

const cardSummaries = {
  "X-Salada": ["Pao brioche", "Blend 90 g", "Queijo prato", "Salada fresca"],
  Cheeseburger: ["Pao brioche", "Blend 90 g", "Cheddar", "Maionese da casa"],
  "X-Bacon": ["Pao brioche", "Blend 90 g", "Cheddar", "Bacon crocante"],
  Agridoce: ["Pao brioche", "Blend 90 g", "Queijo coalho", "Abacaxi caramelizado"],
  Duplo: ["Pao brioche", "2 blends 90 g", "Duplo cheddar", "Bacon em cubos"],
};

const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const isCoreIngredient = (name) => /\b(pao|brioche|blend|carne|hamburguer|burger|patty)\b/.test(normalize(name));

export function getRemovableIngredients(product) {
  if (!product) return [];

  const ingredients = Array.isArray(product.ingredients) ? product.ingredients.filter((name) => typeof name === "string" && name.trim()) : [];
  const summary = cardSummaries[product.name];
  const usesCardSummary = summary && ingredients.length === summary.length && ingredients.every((name, index) => normalize(name) === normalize(summary[index]));

  if (standardRemovals[product.name] && (!ingredients.length || usesCardSummary)) {
    return standardRemovals[product.name];
  }

  return [...new Set(ingredients.map((name) => name.trim()).filter((name) => !isCoreIngredient(name)))];
}
