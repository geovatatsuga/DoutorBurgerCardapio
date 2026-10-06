const fallbackImage = "/assets/new-direction/doutor-burger.webp";
const oldComboImage = "/assets/products/combo-doutor-burgerc.webp";
const sideImages = {
  "batata simples": ["/assets/products/batata-simples-wide.webp", ["/assets/new-direction/batata-cheddar-bacon.webp", "/assets/products/batata-cheddar-bacon-burgerc.webp"]],
  "batata cheddar & bacon": ["/assets/products/batata-cheddar-bacon-wide.webp", ["/assets/new-direction/batata-cheddar-bacon.webp", "/assets/products/batata-cheddar-bacon-burgerc.webp"]],
  "onion rings": ["/assets/products/onion-rings-wide.webp", ["/assets/new-direction/veggie-doctor.webp", "/assets/products/batata-cheddar-bacon-burgerc.webp"]],
  nuggets: ["/assets/products/nuggets-wide.webp", ["/assets/products/chicken-crispy-burgerc.webp"]],
  "nuggets 6 un": ["/assets/products/nuggets-wide.webp", ["/assets/new-direction/chicken-crispy.webp"]],
};

const catalogImages = {
  "x-salada": ["x-salada", "/assets/products/x-salada-wide.webp"],
  cheeseburger: ["cheeseburger", "/assets/products/cheeseburger-wide.webp"],
  "x-bacon": ["x-bacon", "/assets/products/x-bacon-wide.webp"],
  agridoce: ["agridoce", "/assets/products/agridoce-wide.webp"],
  duplo: ["duplo", "/assets/products/duplo-wide.webp"],
  "combo classico": [null, "/assets/products/combo-classico-wide.webp"],
  "combo premium": [null, "/assets/products/combo-premium-wide.webp"],
  "combo fome grande": [null, "/assets/products/combo-fome-grande-wide.webp"],
  "combo dupla": [null, "/assets/products/combo-dupla-wide.webp"],
  "combo degustacao": [null, "/assets/products/combo-degustacao-wide.webp"],
  "combo galera": [null, "/assets/products/combo-galera-wide.webp"],
};

export function resolveCatalogImage(name, imagePath) {
  const key = (name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const side = sideImages[key.replace(/\s+[pg]$/, "")];
  if (side && (!imagePath || side[1].includes(imagePath))) return side[0];
  const entry = catalogImages[key];
  if (!entry) return imagePath || fallbackImage;

  const [burgerSlug, newImage] = entry;
  const oldImage = burgerSlug ? `/assets/products/${burgerSlug}-burgerc.webp` : oldComboImage;
  const oldPng = burgerSlug ? `/assets/products/${burgerSlug}-burgerc.png` : oldComboImage;
  return !imagePath || imagePath === fallbackImage || imagePath === oldImage || imagePath === oldPng
    ? newImage
    : imagePath;
}
