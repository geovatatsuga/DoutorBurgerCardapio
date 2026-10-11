export type PostalAddress = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
};

export function onlyCepDigits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizePlace(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findDeliveryZone<T extends { name: string; is_active?: boolean }>(
  address: PostalAddress,
  zones: T[],
): T | null {
  if (address.erro || normalizePlace(address.uf) !== "pb") return null;
  const city = normalizePlace(address.localidade);
  const neighborhood = normalizePlace(address.bairro);
  if (!neighborhood || !["joao pessoa", "bayeux"].includes(city)) return null;
  const expectedName = city === "bayeux" ? `bayeux ${neighborhood}` : neighborhood;
  return zones.find((zone) => zone.is_active !== false && normalizePlace(zone.name) === expectedName) ?? null;
}

export function formatDeliveryAddress(address: Record<string, unknown> | null | undefined): string {
  if (!address) return "";
  const street = String(address.street || address.address || "").trim();
  if (!address.number) return street;
  const location = [address.neighborhood, address.city, address.uf].filter(Boolean).join(", ");
  const cep = address.cep ? `CEP ${address.cep}` : "";
  return [`${street}, ${address.number}`, location, cep].filter(Boolean).join(" - ");
}
