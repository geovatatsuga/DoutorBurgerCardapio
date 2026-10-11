export const BUSINESS_INFO = {
  legalName: "67.929.090 FELIPE CORDEIRO MAIA",
  cnpj: "67.929.090/0001-70",
  address: "Rua Clotilde Torres, 116-B, Alto do Mateus, João Pessoa - PB, CEP 58090-240",
  location: "João Pessoa - PB",
  whatsapp: "(83) 99966-2590",
};

export function storeWhatsappUrl(phone, message) {
  const digits = String(phone || BUSINESS_INFO.whatsapp).replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
